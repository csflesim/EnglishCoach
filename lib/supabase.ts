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
