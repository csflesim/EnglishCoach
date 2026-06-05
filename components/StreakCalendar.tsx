"use client";

// 學習打卡日曆:近 ~12 週,依當天練習分鐘上色(自動,不用手動打卡)
// 沒學=紅 / 0–10分=灰 / 11–30=黃 / 30+=綠

const WEEKS = 13;

function color(min: number | undefined): string {
  if (min === undefined) return "bg-red-500/40";      // 沒學
  if (min <= 10) return "bg-slate-500/60";            // 0–10
  if (min <= 30) return "bg-gold/70";                 // 11–30
  return "bg-accent";                                 // 30+
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StreakCalendar({ minutes }: { minutes: Record<string, number> }) {
  const today = new Date();
  // 對齊到本週週日結尾;往回 WEEKS 週
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay())); // 本週六
  const days: Date[] = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    days.push(d);
  }
  // 切成週(每欄 7 天,週日→週六)
  const cols: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-200">學習打卡日曆</div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/40" />沒學
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-500/60" />≤10
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gold/70" />≤30
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />30+
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {cols.map((week, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {week.map((d) => {
              const future = d > today;
              const key = ymd(d);
              return (
                <div
                  key={key}
                  title={`${key}${minutes[key] ? ` · ${Math.round(minutes[key])} 分鐘` : future ? "" : " · 沒學"}`}
                  className={`h-3 w-3 rounded-sm ${future ? "bg-ink-800" : color(minutes[key])}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
