// 學習進度。有 Supabase → progress 表(lesson_id, drill_type);否則 localStorage。
// 讀取走記憶體 cache(同步);initProgress 載入、markSession 寫入。
//
// 掌握階層(由小到大):
//   句框掌握 = 該句框「每一種人稱」都練過(替換);轉換 = 每人稱 × 每操作都練過
//   模式掌握 = 該模式「每一個句框」都掌握
//   單元掌握 = 「每一種模式」都掌握
// 完成紀錄以細粒度 key 存進 progress.drill_type 欄(text),無需改 schema。

import {
  lessons,
  availableModes,
  framesOf,
  transformFrames,
  PERSON_ORDER,
  TRANSFORM_OPS,
  type DrillType,
  type PatternLesson,
  type SubFrame,
  type PKey,
} from "./mock";
import { hasSupabase, selectAll, upsertRows } from "./supabase";

const LKEY = "erc_progress_v2";

// lessonId -> 已完成的細粒度 key 清單
export type ProgressMap = Record<string, string[]>;

// ── 完成 key ──
const subKey = (frame: string, person: string) => `S|${frame}|${person}`;
const transKey = (frame: string, person: string, op: string) => `T|${frame}|${person}|${op}`;
// 替換句框需要的人稱清單(固定主詞→只該人稱;有變位→6 人稱;無變位→單一 "-")
function subPersons(f: SubFrame): string[] {
  if (!f.conj) return ["-"];
  return f.subj ? [f.subj] : (PERSON_ORDER as readonly string[]).slice();
}
function transPersons(f: SubFrame): string[] {
  return f.subj ? [f.subj] : (PERSON_ORDER as readonly string[]).slice();
}

function readLocal(): ProgressMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LKEY) || "{}"); } catch { return {}; }
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

export async function initProgress(): Promise<ProgressMap> {
  if (loaded) return cache ?? {};
  loaded = true;
  if (hasSupabase) {
    const rows = await selectAll<{ lesson_id: string; drill_type: string }>("progress");
    const m: ProgressMap = {};
    for (const r of rows) (m[r.lesson_id] = m[r.lesson_id] ?? []).push(r.drill_type);
    cache = m;
  } else {
    cache = readLocal();
  }
  return cache;
}

// 完成一輪 → 依模式/句框/人稱/操作寫入對應的細粒度 key(可能多個,如「全部輪流」)
export function markSession(
  p: ProgressMap,
  lessonId: string,
  opts: { mode: DrillType; frame?: string; person?: PKey | "all"; op?: string },
): ProgressMap {
  if (!cache) cache = p ?? {};
  const lesson = lessons.find((l) => l.id === lessonId);
  const keys: string[] = [];
  if (opts.mode === "Substitution") {
    const f = lesson ? framesOf(lesson).find((x) => x.frame === opts.frame) : undefined;
    if (f) {
      const persons = f.conj
        ? (opts.person && opts.person !== "all" ? [opts.person] : subPersons(f)) // 指定人稱→只記該人稱;全部輪流→全記
        : ["-"];
      for (const pp of persons) keys.push(subKey(f.frame, pp));
    } else if (opts.frame) {
      keys.push(subKey(opts.frame, "-"));
    }
  } else if (opts.mode === "Transformation") {
    const f = lesson ? transformFrames(lesson).find((x) => x.frame === opts.frame) : undefined;
    if (f && opts.op) {
      const person = f.subj ?? (opts.person && opts.person !== "all" ? opts.person : "I");
      keys.push(transKey(f.frame, person, opts.op));
    }
  } else {
    keys.push(String(opts.mode)); // expansion / response:粗粒度
  }
  return addKeys(lessonId, keys);
}

function addKeys(lessonId: string, keys: string[]): ProgressMap {
  const base = cache ?? {};
  const set = new Set(base[lessonId] ?? []);
  keys.forEach((k) => set.add(k));
  cache = { ...base, [lessonId]: Array.from(set) };
  if (hasSupabase && keys.length) upsertRows("progress", keys.map((k) => ({ lesson_id: lessonId, drill_type: k })), "lesson_id,drill_type");
  else writeLocal(cache);
  return cache;
}

// ── 掌握判定 ──
function frameMastered(done: Set<string>, f: SubFrame, mode: DrillType): boolean {
  if (mode === "Transformation") {
    return transPersons(f).every((pp) => TRANSFORM_OPS.every((op) => done.has(transKey(f.frame, pp, op))));
  }
  return subPersons(f).every((pp) => done.has(subKey(f.frame, pp)));
}
function modeFrames(lesson: PatternLesson, mode: DrillType): SubFrame[] {
  return mode === "Transformation" ? transformFrames(lesson) : framesOf(lesson);
}
function modeMastered(done: Set<string>, lesson: PatternLesson, mode: DrillType): boolean {
  const frames = modeFrames(lesson, mode);
  return frames.length > 0 && frames.every((f) => frameMastered(done, f, mode));
}

// 句框層進度(人稱 done/total;轉換為 人稱×操作)
export function frameProgress(p: ProgressMap, lesson: PatternLesson, mode: DrillType, frame: string) {
  const done = new Set(p[lesson.id] ?? []);
  const f = modeFrames(lesson, mode).find((x) => x.frame === frame);
  if (!f) return { done: 0, total: 0, mastered: false };
  if (mode === "Transformation") {
    const persons = transPersons(f);
    const total = persons.length * TRANSFORM_OPS.length;
    let d = 0;
    for (const pp of persons) for (const op of TRANSFORM_OPS) if (done.has(transKey(f.frame, pp, op))) d++;
    return { done: d, total, mastered: d >= total };
  }
  const persons = subPersons(f);
  const d = persons.filter((pp) => done.has(subKey(f.frame, pp))).length;
  return { done: d, total: persons.length, mastered: d >= persons.length };
}

// 模式層進度(句框 done/total)
export function modeProgress(p: ProgressMap, lesson: PatternLesson, mode: DrillType) {
  const done = new Set(p[lesson.id] ?? []);
  const frames = modeFrames(lesson, mode);
  const d = frames.filter((f) => frameMastered(done, f, mode)).length;
  return { done: d, total: frames.length, mastered: frames.length > 0 && d >= frames.length };
}

// 單元層進度(模式 done/total)
export function lessonProgress(p: ProgressMap, lesson: PatternLesson) {
  const done = new Set(p[lesson.id] ?? []);
  const avail = availableModes(lesson);
  const d = avail.filter((m) => modeMastered(done, lesson, m)).length;
  return { done: d, total: avail.length, mastered: avail.length > 0 && d >= avail.length };
}

// 單一人稱/操作是否已完成(供選單打 ✓)
export function isSubDone(p: ProgressMap, lessonId: string, frame: string, person: string): boolean {
  return (p[lessonId] ?? []).includes(subKey(frame, person));
}
export function isTransDone(p: ProgressMap, lessonId: string, frame: string, person: string, op: string): boolean {
  return (p[lessonId] ?? []).includes(transKey(frame, person, op));
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
