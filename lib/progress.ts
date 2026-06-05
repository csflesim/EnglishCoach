// ──────────────────────────────────────────────────────────────────────────
// 學習進度（localStorage 持久化）— 讓學習者能在 30 單元地圖上實際推進。
// 之後接 Supabase 時換成資料表 (attempts / weakness_items) 即可。
// ──────────────────────────────────────────────────────────────────────────

import { lessons, availableModes, type DrillType, type PatternLesson } from "./mock";

const KEY = "erc_progress_v1";

// lessonId -> 已完成的模式清單（如 ["Substitution","Transformation"]）
export type ProgressMap = Record<string, DrillType[]>;

export function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProgress(p: ProgressMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// 標記某課的某模式已完成，回傳新的 map
export function markMode(p: ProgressMap, lessonId: string, mode: DrillType): ProgressMap {
  const done = new Set(p[lessonId] ?? []);
  done.add(mode);
  const next = { ...p, [lessonId]: Array.from(done) };
  saveProgress(next);
  return next;
}

// 一課的完成度
export function lessonProgress(p: ProgressMap, lesson: PatternLesson) {
  const avail = availableModes(lesson);
  const done = (p[lesson.id] ?? []).filter((m) => avail.includes(m));
  return { done: done.length, total: avail.length, mastered: avail.length > 0 && done.length >= avail.length };
}

// 已掌握的單元數
export function masteredCount(p: ProgressMap): number {
  return lessons.filter((l) => lessonProgress(p, l).mastered).length;
}

// 推薦下一課：學習路徑順序中，第一個「已建好但尚未掌握」的課；都掌握則回傳最後一個已建好的
export function recommendNextLessonId(p: ProgressMap, orderedLessonIds: string[]): string {
  for (const id of orderedLessonIds) {
    const lesson = lessons.find((l) => l.id === id);
    if (lesson && !lessonProgress(p, lesson).mastered) return id;
  }
  return orderedLessonIds[orderedLessonIds.length - 1] ?? lessons[0].id;
}
