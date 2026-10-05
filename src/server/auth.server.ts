import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getCookie, setCookie, deleteCookie } from "vinxi/http";

const JWT_SECRET = new TextEncoder().encode("SUPER_SECRET_KEY_REPLACE_ME_IN_PROD_12345");

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, role: string, employeeNumber: string) {
  const token = await new SignJWT({ userId, role, employeeNumber })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  setCookie("plenum_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function destroySession() {
  deleteCookie("plenum_session");
}

export async function getSession() {
  const token = getCookie("plenum_session");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; role: string; employeeNumber: string };
  } catch (error) {
    return null;
  }
}
