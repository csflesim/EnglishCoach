// 真實練習紀錄。寫入 practice_sessions;供「我的」頁數據 + 打卡日曆。
import { hasSupabase, insertScoped, selectAllScoped } from "./supabase";

export type PracticeSession = {
  day: string;
  started_at: string;
  duration_sec: number;
  drill_type: string | null;
  lesson_id: string | null;
  reps: number;
  avg_reaction: number | null;
};

function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function logSession(s: {
  duration_sec: number;
  drill_type?: string;
  lesson_id?: string;
  reps?: number;
  avg_reaction?: number | null;
}): Promise<void> {
  if (!hasSupabase) return;
  await insertScoped("practice_sessions", [{
    day: localDay(),
    started_at: new Date().toISOString(),
    duration_sec: Math.round(s.duration_sec),
    drill_type: s.drill_type ?? null,
    lesson_id: s.lesson_id ?? null,
    reps: s.reps ?? 0,
    avg_reaction: s.avg_reaction ?? null,
  }]);
}

export async function getSessions(): Promise<PracticeSession[]> {
  if (!hasSupabase) return [];
  return selectAllScoped<PracticeSession>("practice_sessions");
}

// 每日總分鐘數 map: { "YYYY-MM-DD": minutes }
export function dailyMinutes(sessions: PracticeSession[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of sessions) m[s.day] = (m[s.day] ?? 0) + s.duration_sec / 60;
  return m;
}

export type PracticeStats = {
  days: number;
  streak: number;
  weekMin: number;
  totalMin: number;
  avgReaction: number | null;
};

// 常錯結構標籤(AI 評分時累積;存 localStorage)
const WKEY = "erc_weakness_tags";
export function bumpWeaknessTag(tag: string) {
  if (typeof window === "undefined" || !tag || tag === "無") return;
  try { const m = JSON.parse(localStorage.getItem(WKEY) || "{}"); m[tag] = (m[tag] || 0) + 1; localStorage.setItem(WKEY, JSON.stringify(m)); } catch { /* ignore */ }
}
export function getWeaknessTags(): { tag: string; count: number }[] {
  if (typeof window === "undefined") return [];
  try {
    const m = JSON.parse(localStorage.getItem(WKEY) || "{}");
    return Object.entries(m).map(([tag, count]) => ({ tag, count: count as number })).sort((a, b) => b.count - a.count);
  } catch { return []; }
}

// 反應太慢:依 lesson 聚合平均反應(慢→快)
export function slowByLesson(sessions: PracticeSession[]): { lesson_id: string; avg: number; count: number }[] {
  const m: Record<string, { sum: number; n: number }> = {};
  for (const s of sessions) {
    if (!s.lesson_id || s.avg_reaction == null) continue;
    const e = (m[s.lesson_id] ??= { sum: 0, n: 0 });
    e.sum += s.avg_reaction; e.n += 1;
  }
  return Object.entries(m)
    .map(([lesson_id, e]) => ({ lesson_id, avg: e.sum / e.n, count: e.n }))
    .sort((a, b) => b.avg - a.avg);
}

export function computeStats(sessions: PracticeSession[]): PracticeStats {
  const mins = dailyMinutes(sessions);
  const days = Object.keys(mins).length;
  const totalMin = sessions.reduce((a, s) => a + s.duration_sec / 60, 0);
  // 本週(近 7 天)
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6 * 86400 * 1000);
  const weekMin = sessions
    .filter((s) => new Date(s.started_at) >= weekAgo)
    .reduce((a, s) => a + s.duration_sec / 60, 0);
  const reacts = sessions.map((s) => s.avg_reaction).filter((x): x is number => x != null);
  const avgReaction = reacts.length ? reacts.reduce((a, b) => a + b, 0) / reacts.length : null;
  // 連續天數(含今天往回)
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (mins[key]) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return { days, streak, weekMin: Math.round(weekMin), totalMin: Math.round(totalMin), avgReaction };
}
