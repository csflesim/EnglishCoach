// 學習進度。雙模式:有 Supabase → kv("progress");否則 localStorage。
// 讀取走記憶體 cache(同步);initProgress 載入、markMode 寫入。

import { lessons, availableModes, type DrillType, type PatternLesson } from "./mock";
import { hasSupabase, kvGet, kvSet } from "./supabase";

const LKEY = "erc_progress_v1";

// lessonId -> 已完成的模式清單
export type ProgressMap = Record<string, DrillType[]>;

function readLocal(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LKEY) || "{}");
  } catch {
    return {};
  }
}
function writeLocal(p: ProgressMap) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LKEY, JSON.stringify(p)); } catch { /* ignore */ }
}

let cache: ProgressMap | null = null;
let loaded = false;

export function loadProgress(): ProgressMap {
  if (!cache) cache = readLocal();
  return cache;
}

// 啟動載入(雲端優先);回傳最新 map 供 UI setState。
export async function initProgress(): Promise<ProgressMap> {
  if (loaded) return cache ?? {};
  loaded = true;
  if (hasSupabase) {
    const remote = await kvGet<ProgressMap>("progress");
    cache = remote ?? readLocal();
    if (!remote) persist();
  } else {
    cache = readLocal();
  }
  return cache;
}

function persist() {
  const p = cache ?? {};
  writeLocal(p);
  if (hasSupabase) kvSet("progress", p);
}

// 標記某課的某模式已完成,回傳新的 map
export function markMode(p: ProgressMap, lessonId: string, mode: DrillType): ProgressMap {
  const base = cache ?? p ?? {};
  const done = new Set(base[lessonId] ?? []);
  done.add(mode);
  cache = { ...base, [lessonId]: Array.from(done) };
  persist();
  return cache;
}

export function lessonProgress(p: ProgressMap, lesson: PatternLesson) {
  const avail = availableModes(lesson);
  const done = (p[lesson.id] ?? []).filter((m) => avail.includes(m));
  return { done: done.length, total: avail.length, mastered: avail.length > 0 && done.length >= avail.length };
}

export function masteredCount(p: ProgressMap): number {
  return lessons.filter((l) => lessonProgress(p, l).mastered).length;
}

export function recommendNextLessonId(p: ProgressMap, orderedLessonIds: string[]): string {
  for (const id of orderedLessonIds) {
    const lesson = lessons.find((l) => l.id === id);
    if (lesson && !lessonProgress(p, lesson).mastered) return id;
  }
  return orderedLessonIds[orderedLessonIds.length - 1] ?? lessons[0].id;
}
