"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import StreakCalendar from "@/components/StreakCalendar";
import { learningPath, getLesson } from "@/lib/mock";
import { initProgress, lessonProgress, type ProgressMap } from "@/lib/progress";
import { getSessions, dailyMinutes, computeStats, type PracticeSession, type PracticeStats } from "@/lib/practice";
import { getReviewItems, isDue } from "@/lib/review";
import { hasSupabase } from "@/lib/supabase";

export default function MinePage() {
  const [p, setP] = useState<ProgressMap>({});
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [due, setDue] = useState(0);

  useEffect(() => {
    initProgress().then(setP);
    getSessions().then((s) => { setSessions(s); setStats(computeStats(s)); });
    Promise.all([getReviewItems("word"), getReviewItems("sentence")]).then(([w, s]) =>
      setDue([...w, ...s].filter(isDue).length),
    );
  }, []);

  const readyIds = learningPath.flatMap((c) => c.units.filter((u) => u.lessonId).map((u) => u.lessonId!));
  const mastered = readyIds.filter((id) => lessonProgress(p, getLesson(id)).mastered).length;
  const unitPct = Math.round((mastered / 30) * 100);

  const cards = [
    { label: "連續天數", value: `${stats?.streak ?? 0}`, sub: "Streak", accent: "text-gold" },
    { label: "練習天數", value: `${stats?.days ?? 0}`, sub: "Days", accent: "text-accent" },
    { label: "本週分鐘", value: `${stats?.weekMin ?? 0}`, sub: "This Week", accent: "text-accent" },
    { label: "平均反應", value: stats?.avgReaction != null ? `${stats.avgReaction.toFixed(1)}s` : "—", sub: "Avg Response", accent: "text-slate-100" },
    { label: "待複習", value: `${due}`, sub: "Due", accent: "text-red-400" },
    { label: "掌握單元", value: `${mastered}/30`, sub: "Mastered", accent: "text-slate-100" },
  ];

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">我的</h1>
        <p className="mt-1 text-sm text-slate-500">真實練習數據,不做複雜分析。</p>
      </div>

      {/* 學習打卡日曆 */}
      <div className="mb-4">
        <StreakCalendar minutes={dailyMinutes(sessions)} />
      </div>

      {!hasSupabase && <p className="mb-3 text-center text-xs text-slate-600">需連 Supabase 才有真實紀錄。</p>}

      {/* 30 單元地圖進度 */}
      <div className="card mb-4 p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-slate-300">學習地圖進度</div>
            <div className="text-3xl font-black text-accent">{mastered} <span className="text-base font-normal text-slate-500">/ 30 單元掌握</span></div>
          </div>
          <span className="text-sm text-slate-500">{unitPct}%</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
          <div className="h-full rounded-full bg-gradient-to-r from-accent-dim to-accent" style={{ width: `${unitPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`text-3xl font-black ${s.accent}`}>{s.value}</div>
            <div className="mt-1 text-sm text-slate-200">{s.label}</div>
            <div className="text-[11px] text-slate-600">{s.sub}</div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-slate-600">
        反射訓練的目標:讓回應變自動。持續操練,平均反應往 1.5 秒以下推進。
      </p>
    </Shell>
  );
}
