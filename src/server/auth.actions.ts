import { createServerFn } from "@tanstack/react-start";

let localDbInstance: any = null;

async function getDB() {
  console.log("getDB called in env:", process.env.NODE_ENV);
  // @ts-ignore
  if (typeof globalThis.DB !== 'undefined') {
    console.log("Using globalThis.DB");
    return globalThis.DB;
  }
  
  if (process.env.NODE_ENV === 'development') {
    if (localDbInstance) return localDbInstance;
    
    console.log("Loading better-sqlite3 using import...");
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      
      const Database = require('better-sqlite3');
      const path = require('path');
      const fs = require('fs');
      
      const dir = path.join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
      const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
      if (files.length === 0) throw new Error("Local D1 database not found");
      
      const dbPath = path.join(dir, files[0]);
      console.log("Connecting to local DB at:", dbPath);
      const db = new Database(dbPath);
      
      localDbInstance = {
        prepare: (query: string) => {
          const stmt = db.prepare(query);
          return {
            bind: (...args: any[]) => {
              return {
                first: async () => stmt.get(...args),
                all: async () => ({ results: stmt.all(...args) })
              }
            }
          }
        }
      };
      return localDbInstance;
    } catch (err) {
      console.error("Error in getDB fallback:", err);
      throw err;
    }
  }
  
  throw new Error("Base de datos D1 no encontrada");
}

export const loginFn = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    try {
      const payload = ctx.data as any;
      const { employeeNumber, password } = payload;
      const { verifyPassword, createSession } = await import("./auth.server");
      
      const DB = await getDB();

      const userRecord = await DB.prepare(`
        SELECT u.id, u.password_hash, u.role, e.employee_number, e.status 
        FROM users u 
        JOIN employees e ON u.id = e.id 
        WHERE e.employee_number = ?
      `).bind(employeeNumber).first();

      if (!userRecord) return { error: "Usuario o contraseña incorrectos" };
      if (userRecord.status !== 'active') return { error: "Cuenta desactivada." };

      const isValid = await verifyPassword(password, userRecord.password_hash as string);
      if (!isValid) return { error: "Usuario o contraseña incorrectos" };

      await createSession(userRecord.id as string, userRecord.role as string, userRecord.employee_number as string);
      return { success: true, user: { id: userRecord.id, role: userRecord.role, employeeNumber: userRecord.employee_number } };
    } catch (error) {
      console.error("loginFn crashed:", error);
      throw error;
    }
  });

export const logoutFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const { destroySession } = await import("./auth.server");
    await destroySession();
    return { success: true };
  });

export const getUserFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { getSession } = await import("./auth.server");
      const session = await getSession();
      if (!session) return null;

      const DB = await getDB();
      const userRecord = await DB.prepare(`
        SELECT u.id, u.role, e.employee_number, e.first_name, e.last_name, e.status 
        FROM users u 
        JOIN employees e ON u.id = e.id 
        WHERE u.id = ?
      `).bind(session.userId).first();

      if (!userRecord || userRecord.status !== 'active') return null;

      return {
        user: { id: userRecord.id },
        employee: {
          id: userRecord.id,
          employee_number: userRecord.employee_number,
          first_name: userRecord.first_name,
          last_name: userRecord.last_name,
          status: userRecord.status
        },
        role: userRecord.role
      };
    } catch (error) {
      console.error("getUserFn crashed:", error);
      throw error;
    }
  });
