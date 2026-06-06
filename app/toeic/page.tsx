"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { genToeic, type ToeicQuestion } from "@/lib/ai";
import { getErrorStats, logErrors, initContent } from "@/lib/content";

const LETTERS = ["A", "B", "C", "D"];

// 無 AI 金鑰時的內建題庫(Part 5 範例)
const FALLBACK: ToeicQuestion[] = [
  { sentence: "The manager asked the team to ____ the report before the meeting.", options: ["finish", "finishes", "finished", "finishing"], answer: 0, skill: "詞性", explanation: "to 後接原形動詞 finish。" },
  { sentence: "Sales have increased ____ the new marketing campaign.", options: ["because", "because of", "so", "although"], answer: 1, skill: "連接詞", explanation: "後接名詞片語 the new campaign,用介系詞片語 because of;because 後要接子句。" },
  { sentence: "All employees ____ required to attend the training session.", options: ["is", "are", "was", "be"], answer: 1, skill: "主謂一致", explanation: "主詞 employees 為複數,用 are。" },
  { sentence: "The new policy will take effect ____ January 1st.", options: ["in", "at", "on", "by"], answer: 2, skill: "介係詞", explanation: "特定日期用 on。" },
  { sentence: "Yesterday the company ____ a new product line.", options: ["launch", "launches", "launched", "will launch"], answer: 2, skill: "時態", explanation: "Yesterday 表過去,用過去式 launched。" },
  { sentence: "This printer is ____ than the old one.", options: ["fast", "faster", "fastest", "more fast"], answer: 1, skill: "比較", explanation: "兩者相比用比較級 faster;than 是線索。" },
  { sentence: "The candidate ____ resume impressed the interviewer.", options: ["who", "whose", "which", "whom"], answer: 1, skill: "關係子句", explanation: "修飾 candidate 且後接名詞 resume,用所有格關係詞 whose。" },
  { sentence: "Please submit your application ____ Friday.", options: ["until", "by", "since", "during"], answer: 1, skill: "介係詞", explanation: "在期限之前完成用 by(截止);until 表持續到某時。" },
];

type Phase = "intro" | "quiz" | "done";

export default function ToeicPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [weak, setWeak] = useState<string[]>([]);
  const [qs, setQs] = useState<ToeicQuestion[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctN, setCorrectN] = useState(0);
  const [wrongSkills, setWrongSkills] = useState<Record<string, number>>({});

  useEffect(() => { initContent().then(() => getErrorStats().then((s) => setWeak(s.slice(0, 4).map((x) => x.tag)))); }, []);

  async function start() {
    setLoading(true); setMsg("");
    const ai = await genToeic({ count: 6, focus: weak });
    setLoading(false);
    const bank = ai && ai.length ? ai : shuffle(FALLBACK).slice(0, 6);
    if (!ai) setMsg("(用內建題庫;設定 OpenAI 金鑰可無限出題、並針對你的弱點)");
    setQs(bank); setI(0); setPicked(null); setCorrectN(0); setWrongSkills({}); setPhase("quiz");
  }

  function choose(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    const q = qs[i];
    if (idx === q.answer) setCorrectN((n) => n + 1);
    else {
      setWrongSkills((m) => ({ ...m, [q.skill]: (m[q.skill] ?? 0) + 1 }));
      logErrors([q.skill], { expected: q.options[q.answer], said: q.options[idx], lessonId: "toeic" }); // 進「分析」常錯結構
    }
  }
  function next() {
    if (i + 1 >= qs.length) setPhase("done");
    else { setI(i + 1); setPicked(null); }
  }

  // ── 開始頁 ──
  if (phase === "intro") {
    return (
      <Shell>
        <div className="mb-5">
          <h1 className="text-2xl font-bold">多益閱讀 · Part 5</h1>
          <p className="mt-1 text-sm text-slate-500">單句文法/詞彙填空,針對你的弱點出題。</p>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-300">這一組會優先考你最常錯的結構:</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {weak.length ? weak.map((w) => <span key={w} className="chip bg-red-500/15 text-[11px] text-red-400">{w}</span>) : <span className="text-xs text-slate-600">(還沒有弱點資料 → 先一般出題)</span>}
          </div>
          <button onClick={start} disabled={loading} className="btn-primary mt-5 w-full py-3">{loading ? "出題中…" : "開始作答(6 題)"}</button>
          <p className="mt-3 text-center text-[11px] text-slate-600">答錯的題型會記進「分析 → 常錯結構」,下次更針對。</p>
        </div>
      </Shell>
    );
  }

  // ── 結果頁 ──
  if (phase === "done") {
    const total = qs.length;
    const pct = Math.round((correctN / Math.max(total, 1)) * 100);
    const weakList = Object.entries(wrongSkills).sort((a, b) => b[1] - a[1]);
    return (
      <Shell>
        <div className="card p-8 text-center">
          <div className="text-5xl">{pct >= 80 ? "🎯" : pct >= 50 ? "💪" : "📚"}</div>
          <h2 className="mt-3 text-2xl font-bold">{correctN} / {total} 答對</h2>
          <div className="mt-1 text-sm text-slate-400">正確率 {pct}%</div>
          {weakList.length > 0 && (
            <div className="mx-auto mt-5 max-w-sm text-left">
              <div className="mb-2 text-sm font-semibold text-slate-300">這次較弱的題型</div>
              <ul className="space-y-1.5">
                {weakList.map(([s, c]) => (
                  <li key={s} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-1.5 text-sm">
                    <span className="text-slate-100">{s}</span><span className="text-xs text-red-400">錯 {c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mx-auto mt-6 flex max-w-sm gap-2">
            <button onClick={() => setPhase("intro")} className="btn-ghost flex-1">回首頁</button>
            <button onClick={start} className="btn-primary flex-1">再來一組</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── 作答頁 ──
  const q = qs[i];
  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-400"><span className="chip mr-2 bg-accent/15 text-accent">Part 5</span>第 {i + 1} / {qs.length} 題</span>
        <span className="text-xs text-slate-500">答對 {correctN}</span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(i / qs.length) * 100}%` }} />
      </div>

      <div className="card p-5">
        <div className="text-lg leading-relaxed text-slate-100">{q.sentence.replace("____", "______")}</div>
        <div className="mt-4 space-y-2">
          {q.options.map((opt, idx) => {
            const isAns = idx === q.answer;
            const isPicked = picked === idx;
            let cls = "border-ink-700 bg-ink-900/40 text-slate-100 hover:border-accent/50";
            if (picked !== null) {
              if (isAns) cls = "border-accent/60 bg-accent/15 text-accent";
              else if (isPicked) cls = "border-red-500/60 bg-red-500/15 text-red-400";
              else cls = "border-ink-700 bg-ink-900/40 text-slate-500";
            }
            return (
              <button key={idx} onClick={() => choose(idx)} disabled={picked !== null} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${cls}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-800 text-xs font-bold">{LETTERS[idx]}</span>
                <span className="flex-1">{opt}</span>
                {picked !== null && isAns && <span className="text-accent">✓</span>}
                {picked !== null && isPicked && !isAns && <span className="text-red-400">✗</span>}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900/40 p-3 text-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className={picked === q.answer ? "chip bg-accent/15 text-accent" : "chip bg-red-500/15 text-red-400"}>{picked === q.answer ? "答對" : "答錯"}</span>
              <span className="chip bg-ink-700 text-[10px] text-slate-400">{q.skill}</span>
            </div>
            <div className="text-slate-200">正解:{LETTERS[q.answer]}. {q.options[q.answer]}</div>
            {q.explanation && <div className="mt-1 text-slate-400">{q.explanation}</div>}
          </div>
        )}
      </div>

      {picked !== null && (
        <button onClick={next} className="btn-primary mt-4 w-full py-3">{i + 1 >= qs.length ? "看結果 →" : "下一題 →"}</button>
      )}
      {msg && <p className="mt-3 text-center text-[11px] text-slate-600">{msg}</p>}
    </Shell>
  );
}

function shuffle<T>(a: T[]): T[] {
  const x = a.slice();
  for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [x[k], x[j]] = [x[j], x[k]]; }
  return x;
}
