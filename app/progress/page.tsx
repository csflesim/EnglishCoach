"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { progress as baseStats, learningPath, getLesson } from "@/lib/mock";
import { loadProgress, lessonProgress, type ProgressMap } from "@/lib/progress";

export default function ProgressPage() {
  const [p, setP] = useState<ProgressMap>({});
  useEffect(() => setP(loadProgress()), []);

  const readyIds = learningPath.flatMap((c) => c.units.filter((u) => u.lessonId).map((u) => u.lessonId!));
  const mastered = readyIds.filter((id) => lessonProgress(p, getLesson(id)).mastered).length;
  const unitPct = Math.round((mastered / 30) * 100);

  const stats = [
    { label: "練習天數", value: `${baseStats.practiceDays}`, sub: "Practice Days", accent: "text-gold" },
    { label: "正確率", value: `${baseStats.accuracy}%`, sub: "Accuracy", accent: "text-accent" },
    { label: "平均反應速度", value: baseStats.avgSpeed, sub: "Avg Response", accent: "text-accent" },
    { label: "估計 CLB", value: baseStats.estClb, sub: "Estimated CLB", accent: "text-slate-100" },
    { label: "弱單字數", value: `${baseStats.weakWords}`, sub: "Weak Words", accent: "text-red-400" },
    { label: "弱句型數", value: `${baseStats.weakPatterns}`, sub: "Weak Patterns", accent: "text-red-400" },
  ];

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">進度</h1>
        <p className="mt-1 text-sm text-slate-500">只看最重要的幾項，不做複雜分析。</p>
      </div>

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
        <p className="mt-2 text-xs text-slate-600">完成一個單元的所有模式(替換/轉換/擴展)即算掌握。</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`text-3xl font-black ${s.accent}`}>{s.value}</div>
            <div className="mt-1 text-sm text-slate-200">{s.label}</div>
            <div className="text-[11px] text-slate-600">{s.sub}</div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-slate-600">
        反射訓練的目標：讓回應變自動。持續操練，讓平均反應速度往 1.5 秒以下推進。
      </p>
    </Shell>
  );
}
