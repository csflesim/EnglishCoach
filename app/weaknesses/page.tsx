"use client";

import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { weaknesses } from "@/lib/mock";

export default function WeaknessesPage() {
  const router = useRouter();
  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">我的弱點</h1>
        <p className="mt-1 text-sm text-slate-500">系統自動追蹤你最常卡住的地方 — 點下去直接針對它操練。</p>
      </div>

      {/* 弱句型 */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">弱句型 (Weak Patterns)</h2>
        <div className="space-y-2">
          {weaknesses.patterns.map((p) => (
            <button
              key={p.pattern}
              onClick={() => p.lessonId && router.push("/")}
              className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500/15 text-sm font-bold text-red-400">{p.count}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-100">{p.pattern}</div>
                <div className="text-xs text-slate-500">{p.issue}</div>
              </div>
              <span className="chip shrink-0 bg-accent/15 text-accent">練這個 →</span>
            </button>
          ))}
        </div>
      </section>

      {/* 反應慢的句型 */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">反應太慢 (Slow Responses)</h2>
        <div className="space-y-2">
          {weaknesses.slow.map((s) => (
            <div key={s.pattern} className="card flex items-center justify-between p-4">
              <span className="truncate text-sm text-slate-200">{s.pattern}</span>
              <span className="chip shrink-0 bg-gold/15 text-gold">平均 {s.avg}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 弱單字 */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">弱單字 (Weak Words)</h2>
        <div className="flex flex-wrap gap-2">
          {weaknesses.words.map((w) => (
            <span key={w.word} className="chip bg-ink-800 text-slate-200">
              {w.word}
              <span className="ml-1 text-red-400">×{w.mistakes}</span>
            </span>
          ))}
        </div>
      </section>

      {/* 常錯結構 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">常錯結構 (Incorrect Structures)</h2>
        <div className="space-y-2">
          {weaknesses.structures.map((s) => (
            <div key={s.issue} className="card flex items-center justify-between p-3">
              <span className="text-sm text-slate-200">{s.issue}</span>
              <span className="text-xs text-slate-500">出現 {s.count} 次</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
