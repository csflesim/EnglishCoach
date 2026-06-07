// ──────────────────────────────────────────────────────────────────────────
// 內容資料層(正規化版)。有 Supabase → 從 DB 載入並取代程式種子;無 → 用 mock 種子。
//   cycles + units + patterns → 重建 lessons / learningPath
//   vocabulary(categories[]) → 展開成替換用 vocabBank
//   wordbooks(名稱) + wordbook_vocab(多對多) → 詞本
// ──────────────────────────────────────────────────────────────────────────

import {
  getLesson,
  seedContent,
  setVocabBank,
  setLessons,
  setLearningPath,
  type SubFrame,
  type VocabWord,
  type PatternLesson,
  type Cycle,
  type Unit,
} from "./mock";
import { hasSupabase, selectAll, selectAllScoped, selectIn, upsertRows, insertRows, insertScoped, deleteWhere, countContains, countRows, pageVocabByBook } from "./supabase";

type CycleRow = { cycle: number; title: string; clb: string };
type UnitRow = { unit: number; cycle: number; goal: string; focus: string; pattern: string; lesson_id: string | null };
type PatternRow = { id: string; unit: number; type: string; transform_frame: string | null; drills: unknown };
type VocabRow = { id: number; word: string; native_zh: string; categories: string[]; pos: string | null; slots: string[] | null; difficulty: number | null; wordbooks: string[] | null };

export type Wordbook = { name: string; label: string | null };
let wbCatalog: Wordbook[] = [];
let applied = false;

// 錯誤紀錄:每次 AI 判錯,把每個錯誤類別逐筆寫入 error_log(供長期分析)
export async function logErrors(kinds: string[], meta: { expected?: string; said?: string; lessonId?: string }): Promise<void> {
  if (!hasSupabase || !kinds.length) return;
  await insertScoped("error_log", kinds.map((kind) => ({ kind, expected: meta.expected ?? null, said: meta.said ?? null, lesson_id: meta.lessonId ?? null })));
}
export async function getErrorStats(): Promise<{ tag: string; count: number }[]> {
  if (!hasSupabase) return [];
  const rows = await selectAllScoped<{ kind: string }>("error_log", "kind");
  const m: Record<string, number> = {};
  for (const r of rows) m[r.kind] = (m[r.kind] ?? 0) + 1;
  return Object.entries(m).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}
// 詳細錯誤樣本(正解 vs 你說的),供 AI 深入分析。取最近 limit 筆。
export type ErrorSample = { kind: string; expected: string | null; said: string | null; lesson_id: string | null };
export async function getErrorSamples(limit = 80): Promise<ErrorSample[]> {
  if (!hasSupabase) return [];
  const rows = await selectAllScoped<ErrorSample>("error_log", "kind,expected,said,lesson_id");
  return rows.slice(-limit);
}

// 已判斷組合快取(句框×單字)。checked=全部判過;bad=判定不通的。鍵 "frame|word"
export const comboKey = (frame: string, word: string) => `${frame}|${word}`;
export async function getComboChecks(): Promise<{ checked: Set<string>; bad: Set<string> }> {
  if (!hasSupabase) return { checked: new Set(), bad: new Set() };
  const rows = await selectAll<{ frame: string; word: string; ok: boolean }>("bad_combos", "frame,word,ok");
  const checked = new Set<string>();
  const bad = new Set<string>();
  for (const r of rows) { const k = comboKey(r.frame, r.word); checked.add(k); if (!r.ok) bad.add(k); }
  return { checked, bad };
}
// 後台用:列出被判定不通(ok=false)的組合
export async function getBadList(): Promise<{ frame: string; word: string; reason: string | null }[]> {
  if (!hasSupabase) return [];
  const rows = await selectAll<{ frame: string; word: string; ok: boolean; reason: string | null }>("bad_combos", "frame,word,ok,reason");
  return rows.filter((r) => !r.ok).map((r) => ({ frame: r.frame, word: r.word, reason: r.reason }));
}
// 記錄一批判斷結果(好壞都記 → 之後不再重判)
export async function recordChecks(frame: string, results: { word: string; ok: boolean }[], reason = "ai"): Promise<void> {
  if (!hasSupabase || !results.length) return;
  await upsertRows("bad_combos", results.map((r) => ({ frame, word: r.word, ok: r.ok, reason })), "frame,word");
}

function cyclesFromRows(cycles: CycleRow[], units: UnitRow[]): Cycle[] {
  return [...cycles].sort((a, b) => a.cycle - b.cycle).map((c) => ({
    cycle: c.cycle,
    title: c.title,
    clb: c.clb,
    units: units
      .filter((u) => u.cycle === c.cycle)
      .sort((a, b) => a.unit - b.unit)
      .map((u) => ({ unit: u.unit, goal: u.goal, focus: u.focus, pattern: u.pattern, lessonId: u.lesson_id ?? undefined } as Unit)),
  }));
}

// 啟動載入(雲端優先)。回傳 Promise 供 UI 載完刷新。
export async function initContent(): Promise<void> {
  if (applied) return;
  applied = true;
  if (!hasSupabase) return; // 無金鑰 → 用程式種子(mock)

  const [cycles, units, pats, vocab, books] = await Promise.all([
    selectAll<CycleRow>("cycles"),
    selectAll<UnitRow>("units"),
    selectAll<PatternRow>("patterns"),
    selectAll<VocabRow>("vocabulary"),
    selectAll<Wordbook>("wordbooks"),
  ]);

  wbCatalog = books.map((b) => ({ name: b.name, label: b.label ?? null }));

  // vocabulary:每個分類展開成一筆(只收有分類的,供替換抓字)
  if (vocab.length) {
    const vb: VocabWord[] = [];
    for (const r of vocab) for (const c of r.categories ?? []) vb.push({ word: r.word, nativeZh: r.native_zh, category: c, pos: r.pos ?? undefined, slots: r.slots ?? undefined, difficulty: r.difficulty ?? undefined, wordbooks: r.wordbooks ?? undefined });
    setVocabBank(vb);
  }

  // lessons:由 units + patterns 重建
  if (units.length) {
    const byUnit = new Map<number, PatternRow[]>();
    for (const p of pats) { const a = byUnit.get(p.unit) ?? []; a.push(p); byUnit.set(p.unit, a); }
    const built: PatternLesson[] = [];
    for (const u of units) {
      if (!u.lesson_id) continue;
      const rows = byUnit.get(u.unit) ?? [];
      const drillsOf = (t: string) => rows.find((r) => r.type === t);
      built.push({
        id: u.lesson_id,
        patternText: u.pattern,
        unit: u.unit,
        transformFrame: drillsOf("transformation")?.transform_frame ?? undefined,
        substitution: (drillsOf("substitution")?.drills as SubFrame[]) ?? [],
        transformation: (drillsOf("transformation")?.drills as PatternLesson["transformation"]) ?? [],
        expansion: (drillsOf("expansion")?.drills as PatternLesson["expansion"]) ?? [],
        response: (drillsOf("response")?.drills as PatternLesson["response"]) ?? [],
      });
    }
    if (built.length) setLessons(built);
    if (cycles.length) setLearningPath(cyclesFromRows(cycles, units));
  }
}

// ── 句框(句型管理)── 寫入 patterns(type=substitution).drills
export async function addFrame(lessonId: string, f: SubFrame): Promise<void> {
  const lesson = getLesson(lessonId);
  lesson.substitution = [...lesson.substitution, f];
  if (hasSupabase)
    await upsertRows("patterns", [{ id: `${lessonId}__substitution`, unit: lesson.unit, type: "substitution", drills: lesson.substitution }], "id");
}
export async function removeFrame(lessonId: string, frame: string): Promise<void> {
  const lesson = getLesson(lessonId);
  lesson.substitution = lesson.substitution.filter((x) => x.frame !== frame);
  if (hasSupabase)
    await upsertRows("patterns", [{ id: `${lessonId}__substitution`, unit: lesson.unit, type: "substitution", drills: lesson.substitution }], "id");
}

// ── 詞本(catalog:name+label;成員存 vocabulary.wordbooks 陣列)──
export function getWordbooks(): Wordbook[] {
  return wbCatalog;
}
export async function createWordbook(name: string, label?: string): Promise<boolean> {
  const n = name.trim();
  if (!n || wbCatalog.some((b) => b.name === n)) return false;
  if (hasSupabase) { const e = await upsertRows("wordbooks", [{ name: n, label: label ?? null }], "name"); if (e) return false; }
  wbCatalog = [...wbCatalog, { name: n, label: label ?? null }];
  return true;
}
export async function removeWordbook(name: string): Promise<void> {
  if (hasSupabase) await deleteWhere("wordbooks", "name", name);
  wbCatalog = wbCatalog.filter((b) => b.name !== name);
}
export async function wordbookCount(name: string): Promise<number> {
  if (!hasSupabase) return 0;
  return name === "ALL" ? countRows("vocabulary") : countContains("vocabulary", "wordbooks", name);
}
export type VocabView = { word: string; native_zh: string; categories: string[]; pos: string | null; difficulty: number | null; box: number | null };
export async function getBookWords(name: string, offset = 0, limit = 60, search = ""): Promise<VocabView[]> {
  if (!hasSupabase) return [];
  return pageVocabByBook<VocabView>(name, offset, limit, search.trim());
}

// 目前使用中的詞本(供之後 AI 選詞來源);存 localStorage
const AKEY = "erc_active_wordbook";
export function getActiveWordbook(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(AKEY); } catch { return null; }
}
export function setActiveWordbook(name: string) {
  try { localStorage.setItem(AKEY, name); } catch { /* ignore */ }
}
// 加字:upsert 進 vocabulary,並把詞本名併入該字的 wordbooks 陣列(讀-合併-寫)
export async function addWordsToBook(name: string, words: string[]): Promise<number> {
  const clean = Array.from(new Set(words.map((w) => w.trim()).filter(Boolean)));
  if (!clean.length || !hasSupabase) return 0;
  const existing = await selectIn<{ word: string; wordbooks: string[] }>("vocabulary", "word", clean, "word,wordbooks");
  const map = new Map(existing.map((r) => [r.word, r.wordbooks ?? []]));
  const rows = clean.map((w) => ({ word: w, wordbooks: Array.from(new Set([...(map.get(w) ?? []), name])) }));
  const e = await upsertRows("vocabulary", rows, "word");
  return e ? 0 : rows.length;
}

// ── 把程式種子上傳到 DB(cycles/units/patterns/vocabulary)──
export async function seedToDb(): Promise<string> {
  if (!hasSupabase) return "未設定 Supabase";
  const cycles = seedContent.learningPath.map((c) => ({ cycle: c.cycle, title: c.title, clb: c.clb }));
  const ce = await upsertRows("cycles", cycles, "cycle"); if (ce) return "週期上傳失敗:" + ce;
  const units = seedContent.learningPath.flatMap((c) =>
    c.units.map((u) => ({
      unit: u.unit, cycle: c.cycle, goal: u.goal, focus: u.focus, pattern: u.pattern,
      // 以 lessons(已有 30 課)對應 unit;確保每個單元都連到課程
      lesson_id: seedContent.lessons.find((l) => l.unit === u.unit)?.id ?? u.lessonId ?? null,
    })),
  );
  const ue = await upsertRows("units", units, "unit"); if (ue) return "單元上傳失敗:" + ue;
  const prows: Record<string, unknown>[] = [];
  for (const l of seedContent.lessons) {
    prows.push({ id: `${l.id}__substitution`, unit: l.unit, type: "substitution", transform_frame: null, drills: l.substitution });
    prows.push({ id: `${l.id}__transformation`, unit: l.unit, type: "transformation", transform_frame: l.transformFrame ?? null, drills: l.transformation });
    prows.push({ id: `${l.id}__expansion`, unit: l.unit, type: "expansion", transform_frame: null, drills: l.expansion });
    if (l.response?.length) prows.push({ id: `${l.id}__response`, unit: l.unit, type: "response", transform_frame: null, drills: l.response });
  }
  const pe = await upsertRows("patterns", prows, "id"); if (pe) return "句型上傳失敗:" + pe;
  // 單字不從種子上傳(改由詞本 + AI 分類產生);替換在 AI 分類前沿用程式種子。
  return `✓ 已上傳 ${cycles.length} 週期、${units.length} 單元、${prows.length} 句型列(單字不上傳)`;
}
