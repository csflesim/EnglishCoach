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

export async function selectAll<T = Record<string, unknown>>(table: string, columns = "*"): Promise<T[]> {
  const c = sb();
  if (!c) return [];
  try {
    const all: T[] = [];
    // PostgREST 預設每次最多 1000 列;分頁抓完(詞本可能上萬字)
    for (let from = 0; ; from += 1000) {
      const { data, error } = await c.from(table).select(columns).range(from, from + 999);
      if (error) return all;
      const rows = (data ?? []) as T[];
      all.push(...rows);
      if (rows.length < 1000) break;
    }
    return all;
  } catch {
    return [];
  }
}

// upsert 並回傳結果列(供取得新插入的 id)
export async function upsertReturning<T = Record<string, unknown>>(
  table: string, rows: Record<string, unknown>[], onConflict: string, columns = "*",
): Promise<T[]> {
  const c = sb();
  if (!c || !rows.length) return [];
  try {
    const out: T[] = [];
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { data, error } = await c.from(table).upsert(chunk, { onConflict, ignoreDuplicates: false }).select(columns);
      if (error) return out;
      out.push(...((data ?? []) as T[]));
    }
    return out;
  } catch {
    return [];
  }
}

export async function selectEq<T = Record<string, unknown>>(table: string, col: string, val: string, columns = "*"): Promise<T[]> {
  const c = sb();
  if (!c) return [];
  try {
    const { data, error } = await c.from(table).select(columns).eq(col, val);
    if (error) return [];
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

export async function selectIn<T = Record<string, unknown>>(table: string, col: string, vals: string[], columns = "*"): Promise<T[]> {
  const c = sb();
  if (!c || !vals.length) return [];
  try {
    const out: T[] = [];
    for (let i = 0; i < vals.length; i += 100) {
      const { data } = await c.from(table).select(columns).in(col, vals.slice(i, i + 100));
      out.push(...((data ?? []) as T[]));
    }
    return out;
  } catch {
    return [];
  }
}

export async function pageVocabByBook<T = Record<string, unknown>>(name: string, offset: number, limit: number, search = ""): Promise<T[]> {
  const c = sb();
  if (!c) return [];
  try {
    let q = c.from("vocabulary").select("word,native_zh,categories,pos").contains("wordbooks", [name]).order("word").range(offset, offset + limit - 1);
    if (search) q = q.ilike("word", `%${search}%`);
    const { data } = await q;
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

export async function countContains(table: string, col: string, val: string): Promise<number> {
  const c = sb();
  if (!c) return 0;
  try {
    const { count } = await c.from(table).select("*", { count: "exact", head: true }).contains(col, [val]);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function insertRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
  const c = sb();
  if (!c || !rows.length) return;
  try { await c.from(table).insert(rows); } catch { /* ignore */ }
}

export async function countRows(table: string, eqCol?: string, eqVal?: string): Promise<number> {
  const c = sb();
  if (!c) return 0;
  try {
    let q = c.from(table).select("*", { count: "exact", head: true });
    if (eqCol) q = q.eq(eqCol, eqVal as string);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
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
