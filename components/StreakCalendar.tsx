"use client";

// 學習打卡日曆:真實月曆,可前後翻月。依當天練習分鐘自動上色(不用手動打卡)。
// 沒學=紅 / 0–10分=灰 / 11–30=黃 / 30+=綠

import { useState } from "react";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function color(min: number | undefined): string {
  if (min === undefined) return "bg-red-500/30 text-red-300/70"; // 沒學
  if (min <= 10) return "bg-slate-500/50 text-slate-200";        // 0–10
  if (min <= 30) return "bg-gold/70 text-ink-950";               // 11–30
  return "bg-accent text-ink-950";                               // 30+
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function StreakCalendar({ minutes }: { minutes: Record<string, number> }) {
  const today = new Date();
  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate());
  const [view, setView] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));

  const firstDow = new Date(view.y, view.m, 1).getDay();        // 當月 1 號是星期幾
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate(); // 當月天數
  const isCurrentMonth = view.y === today.getFullYear() && view.m === today.getMonth();

  // 格子:前置空白 + 1..daysInMonth
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function shift(delta: number) {
    setView((v) => {
      const nd = new Date(v.y, v.m + delta, 1);
      return { y: nd.getFullYear(), m: nd.getMonth() };
    });
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-200">學習打卡日曆</div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/30" />沒學
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-500/50" />≤10
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gold/70" />≤30
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />30+
        </div>
      </div>

      {/* 月份切換 */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="btn-ghost px-3 py-1 text-sm">‹</button>
        <div className="text-base font-semibold text-slate-100">{view.y} 年 {view.m + 1} 月</div>
        <button onClick={() => shift(1)} disabled={isCurrentMonth} className={`btn-ghost px-3 py-1 text-sm ${isCurrentMonth ? "opacity-30" : ""}`}>›</button>
      </div>

      {/* 星期列 */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>

      {/* 日期格 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const key = ymd(view.y, view.m, d);
          const min = minutes[key];
          const future = new Date(view.y, view.m, d) > today && key !== todayKey;
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              title={future ? key : `${key}${min ? ` · ${Math.round(min)} 分鐘` : " · 沒學"}`}
              className={`flex aspect-square items-center justify-center rounded-md text-xs font-medium ${
                future ? "bg-ink-800/50 text-slate-700" : color(min)
              } ${isToday ? "ring-2 ring-accent" : ""}`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
