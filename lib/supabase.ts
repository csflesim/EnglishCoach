// Supabase 客戶端 + 簡單 KV 存取。
// 沒設環境變數 → hasSupabase=false → 全部退回 localStorage(app 照常運作)。

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 支援新版 publishable key 或舊版 anon key
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = !!(url && anon);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (!client) client = createClient(url as string, anon as string);
  return client;
}

// kv 表：key text primary key, value jsonb
export async function kvGet<T>(key: string): Promise<T | null> {
  const c = sb();
  if (!c) return null;
  try {
    const { data, error } = await c.from("kv").select("value").eq("key", key).maybeSingle();
    if (error) return null;
    return (data?.value ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const c = sb();
  if (!c) return;
  try {
    await c.from("kv").upsert({ key, value }, { onConflict: "key" });
  } catch {
    /* ignore */
  }
}

export async function selectAll<T = Record<string, unknown>>(table: string): Promise<T[]> {
  const c = sb();
  if (!c) return [];
  try {
    const { data, error } = await c.from(table).select("*");
    if (error) return [];
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

export async function deleteWhere(table: string, col: string, val: string): Promise<void> {
  const c = sb();
  if (!c) return;
  try {
    await c.from(table).delete().eq(col, val);
  } catch {
    /* ignore */
  }
}

// 批量 upsert(分批避免 payload 過大);成功回 null,失敗回錯誤訊息
export async function upsertRows(table: string, rows: Record<string, unknown>[], onConflict?: string): Promise<string | null> {
  const c = sb();
  if (!c) return "未設定 Supabase";
  try {
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await c.from(table).upsert(chunk, onConflict ? { onConflict } : undefined);
      if (error) return error.message;
    }
    return null;
  } catch (e) {
    return String(e);
  }
}
