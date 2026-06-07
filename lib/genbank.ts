// AI 生成內容題庫(gen_bank)。每次生成都存,之後優先重用,不浪費額度。
import { hasSupabase, insertRows, selectEq } from "./supabase";
import type { ReadingPassage, ToeicQuestion } from "./ai";

function shuffle<T>(a: T[]): T[] {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

// ── 閱讀短文 ──
export async function saveReading(p: ReadingPassage, level: string, topic: string): Promise<void> {
  if (!hasSupabase) return;
  await insertRows("gen_bank", [{ kind: "reading", level, topic: topic || null, payload: p }]);
}
export async function getReadingFromBank(level?: string): Promise<ReadingPassage | null> {
  if (!hasSupabase) return null;
  const rows = await selectEq<{ payload: ReadingPassage; level: string }>("gen_bank", "kind", "reading", "payload,level");
  if (!rows.length) return null;
  const pool = level ? rows.filter((r) => r.level === level) : rows;
  const use = pool.length ? pool : rows;
  return use[Math.floor(Math.random() * use.length)].payload;
}
export async function readingBankCount(): Promise<number> {
  if (!hasSupabase) return 0;
  return (await selectEq("gen_bank", "kind", "reading", "id")).length;
}

// ── 多益題目(每題一列)──
export async function saveToeic(qs: ToeicQuestion[]): Promise<void> {
  if (!hasSupabase || !qs.length) return;
  await insertRows("gen_bank", qs.map((q) => ({ kind: "toeic", tags: [q.skill], payload: q })));
}
export async function getToeicFromBank(count: number, focus: string[]): Promise<ToeicQuestion[]> {
  if (!hasSupabase) return [];
  const rows = await selectEq<{ payload: ToeicQuestion }>("gen_bank", "kind", "toeic", "payload");
  let pool = rows.map((r) => r.payload).filter(Boolean);
  if (focus.length) { const f = new Set(focus); const pref = pool.filter((q) => f.has(q.skill)); if (pref.length) pool = pref; }
  return shuffle(pool).slice(0, count);
}
