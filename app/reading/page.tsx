"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { genReading, type ReadingPassage } from "@/lib/ai";
import { logReview } from "@/lib/review";
import { logSession } from "@/lib/practice";
import { logErrors, initContent } from "@/lib/content";
import { getReadingFromBank, saveReading } from "@/lib/genbank";

type Phase = "intro" | "loading" | "read" | "quiz" | "result";
const LEVELS: { key: string; label: string; desc: string }[] = [
  { key: "easy", label: "簡單", desc: "A2–B1 · 約 200 字" },
  { key: "medium", label: "中等", desc: "B1–B2 · 約 280 字" },
  { key: "ielts", label: "雅思", desc: "Academic · 約 320 字" },
];
const TFNG = ["True", "False", "Not Given"];
const LETTERS = ["A", "B", "C", "D"];

const FALLBACK: ReadingPassage = {
  title: "City Bicycles",
  passage:
    "Many cities around the world have introduced public bicycle programs. Riders can pick up a bike at one station and return it at another, paying only a small fee. Supporters say the bikes reduce traffic and air pollution, and give people a cheap way to travel short distances.\n\nHowever, the programs are not always successful. Some bikes are damaged or stolen, and stations in busy areas often run out of bicycles during rush hour. To solve this, several cities now use vans to move bikes from full stations to empty ones. Despite these problems, the number of cities offering shared bikes continues to grow each year.",
  wordCount: 110,
  questions: [
    { type: "tfng", prompt: "Public bikes can be returned to a different station from where they were taken.", answer: "True", explanation: "文中說 pick up at one station and return at another。" },
    { type: "tfng", prompt: "Using a public bike is completely free.", answer: "False", explanation: "需付 a small fee,並非免費。" },
    { type: "tfng", prompt: "Most accidents are caused by public bikes.", answer: "Not Given", explanation: "文章沒提到事故。" },
    { type: "mcq", prompt: "Why do some cities use vans?", options: ["To repair bikes", "To move bikes between stations", "To sell bikes", "To clean stations"], answer: 1, explanation: "move bikes from full stations to empty ones。" },
  ],
  vocab: [{ word: "introduce", zh: "引進、推出" }, { word: "reduce", zh: "減少" }, { word: "pollution", zh: "污染" }, { word: "damaged", zh: "損壞的" }, { word: "rush hour", zh: "尖峰時間" }],
};

export default function ReadingPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState("easy");
  const [topic, setTopic] = useState("");
  const [msg, setMsg] = useState("");
  const [data, setData] = useState<ReadingPassage | null>(null);
  const [answers, setAnswers] = useState<(string | number | null)[]>([]);
  const [readSec, setReadSec] = useState(0);
  const [liveSec, setLiveSec] = useState(0);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { initContent(); }, []);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function start(forceNew = false) {
    setPhase("loading"); setMsg("");
    let d: ReadingPassage | null = null;
    // 題庫優先(不扣額度);指定主題或要新題才呼叫 AI
    if (!forceNew && !topic.trim()) d = await getReadingFromBank(level);
    if (!d) {
      const r = await genReading({ level, topic: topic.trim() });
      if (r) { d = r; saveReading(r, level, topic.trim()); } // 存進題庫,日後重用
    }
    if (!d) { d = FALLBACK; setMsg("(用內建範例;設定 OpenAI 金鑰可無限生成、選難度與主題)"); }
    setData(d); setAnswers(new Array(d.questions.length).fill(null)); setAdded({});
    setPhase("read");
    startRef.current = Date.now(); setReadSec(0); setLiveSec(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setLiveSec(Math.round((Date.now() - startRef.current) / 1000)), 1000);
  }
  function finishReading() {
    if (timerRef.current) clearInterval(timerRef.current);
    setReadSec(Math.max(1, Math.round((Date.now() - startRef.current) / 1000)));
    setPhase("quiz");
  }
  function choose(qi: number, val: string | number) {
    setAnswers((a) => { const n = a.slice(); n[qi] = val; return n; });
  }
  function submit() {
    if (!data) return;
    // 記錄練習 + 答錯題型
    const wrongTypes: string[] = [];
    data.questions.forEach((q, i) => { const ok = q.type === "mcq" ? answers[i] === q.answer : answers[i] === q.answer; if (!ok) wrongTypes.push(q.type === "tfng" ? "閱讀:是非未提" : "閱讀:選擇"); });
    if (wrongTypes.length) logErrors(wrongTypes, { lessonId: "reading" });
    logSession({ duration_sec: readSec, drill_type: "Reading", lesson_id: "reading", reps: data.questions.length, avg_reaction: null });
    setPhase("result");
  }
  function addVocab(w: string, zh: string) {
    logReview({ kind: "word", ref: `word:${w}`, text: w, nativeZh: zh, patternId: "reading", event: "unknown" });
    setAdded((m) => ({ ...m, [w]: true }));
  }

  const wpm = data && readSec ? Math.round(data.wordCount / (readSec / 60)) : 0;
  const correctN = data ? data.questions.filter((q, i) => answers[i] === q.answer).length : 0;

  // ── 開始頁 ──
  if (phase === "intro") {
    return (
      <Shell>
        <div className="mb-5"><h1 className="text-2xl font-bold">閱讀專區</h1><p className="mt-1 text-sm text-slate-500">限時讀短文 → 量閱讀速度(WPM)→ 雅思題型作答 → 生字進閃卡。</p></div>
        <div className="card p-5">
          <div className="mb-2 text-sm font-semibold text-slate-200">難度</div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button key={l.key} onClick={() => setLevel(l.key)} className={`rounded-xl p-3 text-center ${level === l.key ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>
                <div className="text-sm font-semibold">{l.label}</div><div className="text-[10px] opacity-70">{l.desc}</div>
              </button>
            ))}
          </div>
          <div className="mb-1 text-sm font-semibold text-slate-200">主題(可留空)</div>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例:environment, technology, health…" className="mb-4 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent" />
          <button onClick={() => start(false)} className="btn-primary w-full py-3">開始閱讀(題庫優先)</button>
          <button onClick={() => start(true)} className="btn-ghost mt-2 w-full py-2.5 text-sm">🤖 生成新題(AI,會扣額度並存入題庫)</button>
          <p className="mt-3 text-center text-[11px] text-slate-600">技巧:先 30 秒掃過(標題+每段首句)抓大意,再依題目關鍵字回文定位,不要逐字回讀。指定主題時一律用 AI 生成。</p>
        </div>
      </Shell>
    );
  }
  if (phase === "loading") return <Shell><div className="card p-8 text-center text-sm text-slate-400 animate-pulse">🤖 正在生成閱讀短文…</div></Shell>;
  if (!data) return <Shell><div className="card p-6 text-center text-sm text-slate-500">載入失敗,請返回重試。</div></Shell>;

  // ── 閱讀頁(計時)──
  if (phase === "read") {
    return (
      <Shell>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-slate-400">📖 限時閱讀</span>
          <span className="tabular-nums text-sm text-accent">{Math.floor(liveSec / 60)}:{String(liveSec % 60).padStart(2, "0")}</span>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-bold text-slate-100">{data.title}</h2>
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">{data.passage}</div>
        </div>
        <button onClick={finishReading} className="btn-primary mt-4 w-full py-3">讀完了,開始作答 →</button>
        <p className="mt-2 text-center text-[11px] text-slate-600">作答時可往回看文章。計時只到「開始作答」,用來算你的閱讀速度。</p>
      </Shell>
    );
  }

  // ── 作答頁 ──
  if (phase === "quiz") {
    const allAnswered = answers.every((a) => a !== null);
    return (
      <Shell>
        <div className="mb-3 text-sm text-slate-400">作答 · {data.questions.length} 題</div>
        <details className="card mb-3 p-3"><summary className="cursor-pointer text-xs text-slate-500">📄 展開文章</summary><div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{data.passage}</div></details>
        <ul className="space-y-3">
          {data.questions.map((q, i) => (
            <li key={i} className="card p-4">
              <div className="mb-2 text-sm text-slate-100"><span className="text-slate-500">{i + 1}. </span>{q.prompt}</div>
              {q.type === "tfng" ? (
                <div className="flex flex-wrap gap-2">
                  {TFNG.map((t) => <button key={t} onClick={() => choose(i, t)} className={`chip ${answers[i] === t ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>{t}</button>)}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(q.options ?? []).map((opt, k) => (
                    <button key={k} onClick={() => choose(i, k)} className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${answers[i] === k ? "border-accent/60 bg-accent/15 text-accent" : "border-ink-700 bg-ink-900/40 text-slate-200"}`}>
                      <span className="text-xs font-bold">{LETTERS[k]}</span>{opt}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <button onClick={submit} disabled={!allAnswered} className={`btn-primary mt-4 w-full py-3 ${allAnswered ? "" : "opacity-40"}`}>看結果 →</button>
      </Shell>
    );
  }

  // ── 結果頁 ──
  return (
    <Shell>
      <div className="card p-6 text-center">
        <div className="text-4xl">{correctN === data.questions.length ? "🎯" : "📖"}</div>
        <h2 className="mt-2 text-2xl font-bold">{correctN} / {data.questions.length} 答對</h2>
        <div className="mt-3 flex justify-center gap-3 text-sm">
          <span className="chip bg-accent/15 text-accent">閱讀速度 {wpm} WPM</span>
          <span className="chip bg-ink-700 text-slate-300">用時 {Math.floor(readSec / 60)}:{String(readSec % 60).padStart(2, "0")}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-600">WPM 參考:150 偏慢 · 200 一般 · 250+ 良好</p>
      </div>

      {/* 逐題解析 */}
      <div className="mt-4 space-y-2">
        {data.questions.map((q, i) => {
          const ok = answers[i] === q.answer;
          const mine = q.type === "mcq" ? (typeof answers[i] === "number" ? `${LETTERS[answers[i] as number]}. ${q.options?.[answers[i] as number] ?? ""}` : "—") : String(answers[i] ?? "—");
          const corr = q.type === "mcq" ? `${LETTERS[q.answer as number]}. ${q.options?.[q.answer as number] ?? ""}` : String(q.answer);
          return (
            <div key={i} className="card p-3.5 text-sm">
              <div className="flex items-start gap-2"><span className={ok ? "text-accent" : "text-red-400"}>{ok ? "✓" : "✗"}</span><span className="text-slate-200">{i + 1}. {q.prompt}</span></div>
              {!ok && <div className="mt-1 pl-5 text-xs text-slate-500">你選:{mine}</div>}
              <div className="mt-0.5 pl-5 text-xs text-accent">正解:{corr}</div>
              {q.explanation && <div className="mt-0.5 pl-5 text-xs text-slate-400">{q.explanation}</div>}
            </div>
          );
        })}
      </div>

      {/* 生字 → 閃卡 */}
      {data.vocab.length > 0 && (
        <div className="card mt-4 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-300">生字(點「+」加入單詞閃卡複習)</div>
          <ul className="space-y-1.5">
            {data.vocab.map((v) => (
              <li key={v.word} className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/40 px-2.5 py-1.5 text-sm">
                <span className="font-semibold text-slate-100">{v.word}</span><span className="text-xs text-slate-500">{v.zh}</span>
                <button onClick={() => addVocab(v.word, v.zh)} disabled={added[v.word]} className={`ml-auto chip text-[11px] ${added[v.word] ? "bg-accent/15 text-accent" : "bg-ink-700 text-slate-300"}`}>{added[v.word] ? "已加入 ✓" : "+ 加入"}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={() => setPhase("intro")} className="btn-ghost flex-1">回設定</button>
        <button onClick={() => start(false)} className="btn-primary flex-1">再來一篇</button>
      </div>
      {msg && <p className="mt-3 text-center text-[11px] text-slate-600">{msg}</p>}
    </Shell>
  );
}
