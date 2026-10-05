import { createServerFn } from "@tanstack/react-start";
import { getEvent } from "vinxi/http";

export const getDebugInfo = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const event = getEvent();
    const keys = Object.keys(event);
    const contextKeys = Object.keys(event.context || {});
    const cloudflareKeys = event.context?.cloudflare ? Object.keys(event.context.cloudflare) : [];
    const envKeys = event.context?.cloudflare?.env ? Object.keys(event.context.cloudflare.env) : [];
    
    return {
      success: true,
      data: {
        keys,
        contextKeys,
        cloudflareKeys,
        envKeys,
        hasDBInEnv: !!event.context?.cloudflare?.env?.DB,
        hasProcessEnvDB: typeof process !== 'undefined' && process.env && !!process.env.DB,
        hasGlobalDB: typeof globalThis !== 'undefined' && !!(globalThis as any).DB
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
