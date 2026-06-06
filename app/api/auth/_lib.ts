import crypto from "crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 優先用 service role(可繞過 RLS、保護 users 表);沒有就退回 anon/publishable
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasDb = !!(URL && KEY);
const headers = { apikey: KEY ?? "", Authorization: `Bearer ${KEY ?? ""}`, "Content-Type": "application/json" } as Record<string, string>;

// scrypt 雜湊:salt:hash;比對用 timingSafeEqual
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const dk = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${dk}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  try {
    const [salt, dk] = stored.split(":");
    if (!salt || !dk) return false;
    const h = crypto.scryptSync(pw, salt, 64);
    const a = Buffer.from(dk, "hex");
    return a.length === h.length && crypto.timingSafeEqual(a, h);
  } catch { return false; }
}

export type DbUser = { id: number; username: string; password_hash: string };

export async function findUser(username: string): Promise<DbUser | null> {
  const r = await fetch(`${URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash`, { headers });
  if (!r.ok) return null;
  const rows = (await r.json()) as DbUser[];
  return rows[0] ?? null;
}
export async function updatePassword(id: number, passwordHash: string): Promise<boolean> {
  const r = await fetch(`${URL}/rest/v1/users?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ password_hash: passwordHash }),
  });
  return r.ok;
}
export async function createUser(username: string, passwordHash: string): Promise<DbUser | null> {
  const r = await fetch(`${URL}/rest/v1/users`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ username, password_hash: passwordHash }),
  });
  if (!r.ok) return null;
  const rows = (await r.json()) as DbUser[];
  return rows[0] ?? null;
}
