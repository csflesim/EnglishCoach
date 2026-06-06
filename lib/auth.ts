// 前端帳號管理:登入狀態存 localStorage,並把 user id 設給 supabase 的 *Scoped 函式。
// 密碼一律走 /api/auth/*(伺服器端 scrypt 雜湊),前端不碰雜湊、不存密碼。

import { setActiveUserId } from "./supabase";

export type AuthUser = { id: string; username: string };
const UKEY = "erc_user";

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try { const s = localStorage.getItem(UKEY); return s ? (JSON.parse(s) as AuthUser) : null; } catch { return null; }
}

export function setCurrentUser(u: AuthUser | null) {
  try { if (u) localStorage.setItem(UKEY, JSON.stringify(u)); else localStorage.removeItem(UKEY); } catch { /* ignore */ }
  setActiveUserId(u ? u.id : null);
}

// 在 app 啟動(render 階段)同步套用目前登入者,確保資料讀取前 user id 已設定
export function applyActiveUser(): AuthUser | null {
  const u = getCurrentUser();
  setActiveUserId(u ? u.id : null);
  return u;
}

export function logout() { setCurrentUser(null); }

async function call(path: string, username: string, password: string): Promise<{ ok: boolean; error?: string; user?: AuthUser }> {
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const j = await r.json();
    if (!r.ok || j.error) return { ok: false, error: j.error || "失敗" };
    setCurrentUser(j.user);
    return { ok: true, user: j.user };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
export const login = (username: string, password: string) => call("/api/auth/login", username, password);
export const signup = (username: string, password: string) => call("/api/auth/signup", username, password);

// 後台建立帳號:建立但「不」切換目前登入者
export async function createAccount(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const j = await r.json();
    if (!r.ok || j.error) return { ok: false, error: j.error || "失敗" };
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}
