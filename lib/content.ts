// ──────────────────────────────────────────────────────────────────────────
// 後台內容覆蓋層：種子內容(mock)之外、後台新增的單字/句框/詞本。
// 雙模式:有設 Supabase → 雲端 kv("content");否則 → localStorage。
// 讀取走記憶體 cache(同步);初始化與寫入處理持久化。
// ──────────────────────────────────────────────────────────────────────────

import {
  addFrameRuntime,
  removeFrameRuntime,
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
import { hasSupabase, kvGet, kvSet, upsertRows, selectAll, deleteWhere } from "./supabase";

const LKEY = "erc_content_v1";

export type WordBook = { name: string; words: string[] };
type Overrides = {
  frames: Record<string, SubFrame[]>; // 後台新增的句框(seed 以外)
  wordbooks: WordBook[]; // 僅非 Supabase 模式用;Supabase 走 wordbooks 表
};

function blank(): Overrides {
  return { frames: {}, wordbooks: [] };
}

function readLocal(): Overrides {
  if (typeof window === "undefined") return blank();
  try {
    const o = JSON.parse(localStorage.getItem(LKEY) || "{}");
    return { frames: o.frames ?? {}, wordbooks: o.wordbooks ?? [] };
  } catch {
    return blank();
  }
}
function writeLocal(o: Overrides) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LKEY, JSON.stringify(o)); } catch { /* ignore */ }
}

let cache: Overrides | null = null;
let wbCache: WordBook[] | null = null; // 詞本(獨立資料表)的記憶體快取
let applied = false;

function cur(): Overrides {
  if (!cache) cache = readLocal();
  return cache;
}
function persist() {
  const o = cur();
  writeLocal(o);
  if (hasSupabase) kvSet("content", o);
}

// 由 units 列重建三週期結構
type UnitRow = { unit: number; cycle: number; cycle_title: string; clb: string; goal: string; focus: string; pattern: string; lesson_id: string | null };
function cyclesFromUnits(rows: UnitRow[]): Cycle[] {
  const byCycle = new Map<number, Cycle>();
  for (const r of [...rows].sort((a, b) => a.unit - b.unit)) {
    let c = byCycle.get(r.cycle);
    if (!c) { c = { cycle: r.cycle, title: r.cycle_title, clb: r.clb, units: [] }; byCycle.set(r.cycle, c); }
    const u: Unit = { unit: r.unit, goal: r.goal, focus: r.focus, pattern: r.pattern, lessonId: r.lesson_id ?? undefined };
    c.units.push(u);
  }
  return Array.from(byCycle.values()).sort((a, b) => a.cycle - b.cycle);
}

type PatternRow = {
  id: string; unit: number; pattern_text: string; transform_frame: string | null;
  drills: Partial<Pick<PatternLesson, "substitution" | "transformation" | "expansion" | "response">>;
};

// 從 Supabase 載入課程內容,取代程式種子(DB 為來源;DB 空則沿用種子)
async function loadContentFromDb(): Promise<void> {
  const [vrows, prows, urows] = await Promise.all([
    selectAll<{ word: string; native_zh: string; category: string }>("vocabulary"),
    selectAll<PatternRow>("patterns"),
    selectAll<UnitRow>("units"),
  ]);
  if (vrows.length) setVocabBank(vrows.map((r) => ({ word: r.word, nativeZh: r.native_zh, category: r.category } as VocabWord)));
  if (prows.length)
    setLessons(prows.map((r) => ({
      id: r.id,
      patternText: r.pattern_text,
      unit: r.unit,
      transformFrame: r.transform_frame ?? undefined,
      substitution: r.drills?.substitution ?? [],
      transformation: r.drills?.transformation ?? [],
      expansion: r.drills?.expansion ?? [],
      response: r.drills?.response ?? [],
    } as PatternLesson)));
  if (urows.length) setLearningPath(cyclesFromUnits(urows));
}

// 啟動時載入(雲端優先)並注入 mock 執行期陣列。回傳 Promise 供 UI 載完刷新。
export async function initContent(): Promise<void> {
  if (applied) return;
  applied = true;
  if (hasSupabase) {
    const remote = await kvGet<Overrides>("content");
    cache = remote ?? readLocal();
    if (!remote) persist(); // 首次:把本機內容上傳當種子
  } else {
    cache = readLocal();
  }
  // DB 驅動:用 Supabase 的課程內容取代程式種子(DB 空則沿用種子)
  if (hasSupabase) await loadContentFromDb();
  Object.entries(cache.frames).forEach(([lessonId, frames]) => frames.forEach((f) => addFrameRuntime(lessonId, f)));
  // 詞本:Supabase 有獨立資料表;否則用本機 content blob 內的 wordbooks
  if (hasSupabase) {
    const rows = await selectAll<{ name: string; words: string[] }>("wordbooks");
    wbCache = rows.map((r) => ({ name: r.name, words: Array.isArray(r.words) ? r.words : [] }));
    cache.wordbooks = []; // 雲端詞本走獨立表,清掉 content blob 的舊殘留
    persist();
  } else {
    wbCache = cache.wordbooks;
  }
  // 句型詞庫(AI 分類後的單字;晚點才跑)
  pvCache = hasSupabase ? await selectAll<PatternVocab>("pattern_vocab") : [];
}

// ── 句型詞庫(pattern_vocab 表:word/native_zh/category;由 AI 分類詞本產生)──
export type PatternVocab = { word: string; native_zh: string; category: string };
let pvCache: PatternVocab[] | null = null;

export function patternVocabCount(category: string): number {
  return (pvCache ?? []).filter((r) => r.category === category).length;
}
export function patternVocabTotal(): number {
  return (pvCache ?? []).length;
}

// ── 句框 ──
export function addFrame(lessonId: string, f: SubFrame) {
  const o = cur();
  o.frames[lessonId] = (o.frames[lessonId] ?? []).concat([f]);
  persist();
  addFrameRuntime(lessonId, f);
}
export function removeFrame(lessonId: string, frame: string) {
  const o = cur();
  o.frames[lessonId] = (o.frames[lessonId] ?? []).filter((x) => x.frame !== frame);
  persist();
  removeFrameRuntime(lessonId, frame);
}

// ── 詞本(多本)── Supabase 有獨立 wordbooks 表;否則存本機 content blob。
function wbList(): WordBook[] {
  if (!wbCache) wbCache = hasSupabase ? [] : cur().wordbooks;
  return wbCache;
}
async function saveBook(book: WordBook) {
  if (hasSupabase) await upsertRows("wordbooks", [{ name: book.name, words: book.words }], "name");
  else { cur().wordbooks = wbList(); persist(); }
}

export function getWordbooks(): WordBook[] {
  return wbList();
}
export async function createWordbook(name: string): Promise<boolean> {
  const n = name.trim();
  if (!n) return false;
  const list = wbList();
  if (list.some((b) => b.name === n)) return false;
  const book: WordBook = { name: n, words: [] };
  wbCache = [...list, book];
  await saveBook(book);
  return true;
}
export async function removeWordbook(name: string) {
  wbCache = wbList().filter((b) => b.name !== name);
  if (hasSupabase) await deleteWhere("wordbooks", "name", name);
  else { cur().wordbooks = wbCache; persist(); }
}
export async function addWordToBook(name: string, word: string): Promise<boolean> {
  const w = word.trim();
  if (!w) return false;
  const book = wbList().find((b) => b.name === name);
  if (!book || book.words.some((x) => x.toLowerCase() === w.toLowerCase())) return false;
  book.words = [...book.words, w];
  wbCache = [...wbList()];
  await saveBook(book);
  return true;
}
export async function removeWordFromBook(name: string, word: string) {
  const book = wbList().find((b) => b.name === name);
  if (!book) return;
  book.words = book.words.filter((x) => x !== word);
  wbCache = [...wbList()];
  await saveBook(book);
}
export async function addWordsToBook(name: string, words: string[]): Promise<number> {
  const book = wbList().find((b) => b.name === name);
  if (!book) return 0;
  const lower = new Set(book.words.map((x) => x.toLowerCase()));
  let n = 0;
  for (const raw of words) {
    const w = raw.trim();
    if (w && !lower.has(w.toLowerCase())) {
      book.words.push(w);
      lower.add(w.toLowerCase());
      n++;
    }
  }
  wbCache = [...wbList()];
  await saveBook(book);
  return n;
}

// ── 把程式內的種子內容(單字 + 句型課)上傳到 Supabase 資料表 ──
export async function seedToDb(): Promise<string> {
  if (!hasSupabase) return "未設定 Supabase";
  const vErr = await upsertRows(
    "vocabulary",
    seedContent.vocab.map((v) => ({ word: v.word, native_zh: v.nativeZh, category: v.category, source: "seed" })),
    "word,category",
  );
  if (vErr) return "單字上傳失敗:" + vErr;
  const pErr = await upsertRows(
    "patterns",
    seedContent.lessons.map((l) => ({
      id: l.id,
      unit: l.unit,
      pattern_text: l.patternText,
      transform_frame: l.transformFrame ?? null,
      drills: { substitution: l.substitution, transformation: l.transformation, expansion: l.expansion, response: l.response },
    })),
    "id",
  );
  if (pErr) return "句型上傳失敗:" + pErr;
  const units = seedContent.learningPath.flatMap((c) =>
    c.units.map((u) => ({
      unit: u.unit,
      cycle: c.cycle,
      cycle_title: c.title,
      clb: c.clb,
      goal: u.goal,
      focus: u.focus,
      pattern: u.pattern,
      lesson_id: u.lessonId ?? null,
    })),
  );
  const uErr = await upsertRows("units", units, "unit");
  if (uErr) return "學習地圖上傳失敗:" + uErr;
  return `✓ 已上傳 ${units.length} 單元地圖、${seedContent.vocab.length} 單字、${seedContent.lessons.length} 句型課到資料庫`;
}
