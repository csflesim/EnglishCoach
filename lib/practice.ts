// 真實練習紀錄。寫入 practice_sessions;供「我的」頁數據 + 打卡日曆。
import { hasSupabase, insertRows, selectAll } from "./supabase";

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
  await insertRows("practice_sessions", [{
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
  return selectAll<PracticeSession>("practice_sessions");
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
