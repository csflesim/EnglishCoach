// ──────────────────────────────────────────────────────────────────────────
// 後台內容覆蓋層：種子內容(mock)之外、後台新增的單字/句框/詞本。
// 雙模式:有設 Supabase → 雲端 kv("content");否則 → localStorage。
// 讀取走記憶體 cache(同步);初始化與寫入處理持久化。
// ──────────────────────────────────────────────────────────────────────────

import {
  addVocabRuntime,
  removeVocabRuntime,
  addFrameRuntime,
  removeFrameRuntime,
  type VocabWord,
  type SubFrame,
} from "./mock";
import { hasSupabase, kvGet, kvSet } from "./supabase";

const LKEY = "erc_content_v1";

export type WordBook = { name: string; words: string[] };
type Overrides = {
  vocab: VocabWord[];
  frames: Record<string, SubFrame[]>;
  wordbooks: WordBook[];
};

function blank(): Overrides {
  return { vocab: [], frames: {}, wordbooks: [] };
}

function readLocal(): Overrides {
  if (typeof window === "undefined") return blank();
  try {
    const o = JSON.parse(localStorage.getItem(LKEY) || "{}");
    const wordbooks: WordBook[] = o.wordbooks ?? (Array.isArray(o.wordbook) && o.wordbook.length ? [{ name: "我的詞本", words: o.wordbook }] : []);
    return { vocab: o.vocab ?? [], frames: o.frames ?? {}, wordbooks };
  } catch {
    return blank();
  }
}
function writeLocal(o: Overrides) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LKEY, JSON.stringify(o)); } catch { /* ignore */ }
}

let cache: Overrides | null = null;
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
  cache.vocab.forEach(addVocabRuntime);
  Object.entries(cache.frames).forEach(([lessonId, frames]) => frames.forEach((f) => addFrameRuntime(lessonId, f)));
}

// ── 單字 ──
export function addVocab(w: VocabWord) {
  const o = cur();
  if (!o.vocab.some((v) => v.word === w.word && v.category === w.category)) {
    o.vocab.push(w);
    persist();
    addVocabRuntime(w);
  }
}
export function removeVocab(word: string, category: string) {
  const o = cur();
  o.vocab = o.vocab.filter((v) => !(v.word === word && v.category === category));
  persist();
  removeVocabRuntime(word, category);
}
export function addVocabBulk(list: VocabWord[]): number {
  let n = 0;
  for (const w of list) {
    if (w.word?.trim() && w.nativeZh?.trim() && w.category?.trim()) {
      addVocab({ word: w.word.trim(), nativeZh: w.nativeZh.trim(), category: w.category.trim() });
      n++;
    }
  }
  return n;
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
export function addFramesBulk(lessonId: string, frames: SubFrame[]): number {
  let n = 0;
  for (const f of frames) {
    if (f.frame?.includes("___") && f.frameZh?.includes("___") && f.category?.trim()) {
      addFrame(lessonId, { frame: f.frame.trim(), frameZh: f.frameZh.trim(), category: f.category.trim() });
      n++;
    }
  }
  return n;
}

// ── 詞本(多本) ──
export function getWordbooks(): WordBook[] {
  return cur().wordbooks;
}
export function createWordbook(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  const o = cur();
  if (o.wordbooks.some((b) => b.name === n)) return false;
  o.wordbooks.push({ name: n, words: [] });
  persist();
  return true;
}
export function removeWordbook(name: string) {
  const o = cur();
  o.wordbooks = o.wordbooks.filter((b) => b.name !== name);
  persist();
}
export function addWordToBook(name: string, word: string): boolean {
  const w = word.trim();
  if (!w) return false;
  const o = cur();
  const book = o.wordbooks.find((b) => b.name === name);
  if (!book || book.words.some((x) => x.toLowerCase() === w.toLowerCase())) return false;
  book.words.push(w);
  persist();
  return true;
}
export function removeWordFromBook(name: string, word: string) {
  const o = cur();
  const book = o.wordbooks.find((b) => b.name === name);
  if (book) book.words = book.words.filter((x) => x !== word);
  persist();
}
export function addWordsToBook(name: string, words: string[]): number {
  const o = cur();
  const book = o.wordbooks.find((b) => b.name === name);
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
  persist();
  return n;
}
