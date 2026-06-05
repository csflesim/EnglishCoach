// ──────────────────────────────────────────────────────────────────────────
// 後台內容覆蓋層：把「種子內容(mock)」之外、後台新增的單字/句框存 localStorage，
// 並在啟動時注入回 mock 的執行期陣列，讓操練真的吃得到。
// 之後接 Supabase 時，這層改成讀寫資料庫即可。
// ──────────────────────────────────────────────────────────────────────────

import {
  addVocabRuntime,
  removeVocabRuntime,
  addFrameRuntime,
  removeFrameRuntime,
  type VocabWord,
  type SubFrame,
} from "./mock";

const KEY = "erc_content_v1";

export type WordBook = { name: string; words: string[] }; // 詞本：具名、只存英文單詞

type Overrides = {
  vocab: VocabWord[];
  frames: Record<string, SubFrame[]>; // lessonId -> 新增句框
  wordbooks: WordBook[];
};

function load(): Overrides {
  if (typeof window === "undefined") return { vocab: [], frames: {}, wordbooks: [] };
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "{}");
    // 舊版單一 wordbook(string[]) → 轉成一個預設詞本
    const wordbooks: WordBook[] = o.wordbooks ?? (Array.isArray(o.wordbook) && o.wordbook.length ? [{ name: "我的詞本", words: o.wordbook }] : []);
    return { vocab: o.vocab ?? [], frames: o.frames ?? {}, wordbooks };
  } catch {
    return { vocab: [], frames: {}, wordbooks: [] };
  }
}
function save(o: Overrides) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    /* ignore */
  }
}

let applied = false;
// 啟動時把覆蓋層注入 mock 執行期陣列（idempotent）
export function initContent() {
  if (applied || typeof window === "undefined") return;
  applied = true;
  const o = load();
  o.vocab.forEach(addVocabRuntime);
  Object.entries(o.frames).forEach(([lessonId, frames]) => frames.forEach((f) => addFrameRuntime(lessonId, f)));
}

// ── 後台操作（同時更新 localStorage + 執行期）──
export function addVocab(w: VocabWord) {
  const o = load();
  if (!o.vocab.some((v) => v.word === w.word && v.category === w.category)) {
    o.vocab.push(w);
    save(o);
    addVocabRuntime(w);
  }
}
export function removeVocab(word: string, category: string) {
  const o = load();
  o.vocab = o.vocab.filter((v) => !(v.word === word && v.category === category));
  save(o);
  removeVocabRuntime(word, category);
}

export function addFrame(lessonId: string, f: SubFrame) {
  const o = load();
  o.frames[lessonId] = (o.frames[lessonId] ?? []).concat([f]);
  save(o);
  addFrameRuntime(lessonId, f);
}
export function removeFrame(lessonId: string, frame: string) {
  const o = load();
  o.frames[lessonId] = (o.frames[lessonId] ?? []).filter((x) => x.frame !== frame);
  save(o);
  removeFrameRuntime(lessonId, frame);
}

// ── 批量上傳 ──
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
// ── 詞本（多本、具名，只存英文單詞）──
export function getWordbooks(): WordBook[] {
  return load().wordbooks;
}
export function createWordbook(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  const o = load();
  if (o.wordbooks.some((b) => b.name === n)) return false;
  o.wordbooks.push({ name: n, words: [] });
  save(o);
  return true;
}
export function removeWordbook(name: string) {
  const o = load();
  o.wordbooks = o.wordbooks.filter((b) => b.name !== name);
  save(o);
}
export function addWordToBook(name: string, word: string): boolean {
  const w = word.trim();
  if (!w) return false;
  const o = load();
  const book = o.wordbooks.find((b) => b.name === name);
  if (!book || book.words.some((x) => x.toLowerCase() === w.toLowerCase())) return false;
  book.words.push(w);
  save(o);
  return true;
}
export function removeWordFromBook(name: string, word: string) {
  const o = load();
  const book = o.wordbooks.find((b) => b.name === name);
  if (book) book.words = book.words.filter((x) => x !== word);
  save(o);
}
export function addWordsToBook(name: string, words: string[]): number {
  const o = load();
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
  save(o);
  return n;
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
