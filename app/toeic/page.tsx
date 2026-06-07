"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { genToeic, type ToeicQuestion } from "@/lib/ai";
import { getErrorStats, logErrors, initContent } from "@/lib/content";
import { TOEIC_BANK } from "@/lib/toeicBank";
import { getWrong, addWrong, removeWrong } from "@/lib/toeicStore";
import { getToeicFromBank, saveToeic } from "@/lib/genbank";

const LETTERS = ["A", "B", "C", "D"];
const ALL_SKILLS = Array.from(new Set(TOEIC_BANK.map((q) => q.skill)));

function pickFromBank(weak: string[], n = 6): ToeicQuestion[] {
  const weakSet = new Set(weak);
  const weakQs = shuffle(TOEIC_BANK.filter((q) => weakSet.has(q.skill)));
  const rest = shuffle(TOEIC_BANK.filter((q) => !weakSet.has(q.skill)));
  return [...weakQs, ...rest].slice(0, n);
}

type Phase = "intro" | "quiz" | "done" | "explain";
type Source = "practice" | "review";

export default function ToeicPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [source, setSource] = useState<Source>("practice");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [weak, setWeak] = useState<string[]>([]);
  const [wrongN, setWrongN] = useState(0);
  const [qs, setQs] = useState<ToeicQuestion[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctN, setCorrectN] = useState(0);
  const [wrongSkills, setWrongSkills] = useState<Record<string, number>>({});
  // 詳解專區
  const [expSkill, setExpSkill] = useState<string>("全部");
  const [expSearch, setExpSearch] = useState("");
  const [expMore, setExpMore] = useState(false);

  useEffect(() => {
    initContent().then(() => getErrorStats().then((s) => setWeak(s.slice(0, 4).map((x) => x.tag))));
    setWrongN(getWrong().length);
  }, []);

  function begin(bank: ToeicQuestion[], src: Source) {
    setSource(src); setQs(bank); setI(0); setPicked(null); setCorrectN(0); setWrongSkills({}); setPhase("quiz");
  }
  function startBank() { setMsg(""); begin(pickFromBank(weak, 6), "practice"); }
  async function startAI() {
    setLoading(true); setMsg("");
    // 先用雲端題庫裡「之前 AI 生成過」的題(不扣額度);不足才生成新題並存起來
    let qs = await getToeicFromBank(6, weak);
    if (qs.length < 6) {
      const ai = await genToeic({ count: 6 - qs.length, focus: weak });
      if (ai && ai.length) { saveToeic(ai); qs = [...qs, ...ai]; }
    }
    setLoading(false);
    if (qs.length) begin(shuffle(qs).slice(0, 6), "practice");
    else { setMsg("AI 出題失敗(可能未設金鑰),改用內建題庫。"); begin(pickFromBank(weak, 6), "practice"); }
  }
  function startReview() {
    const w = shuffle(getWrong()).slice(0, 10);
    if (!w.length) return;
    begin(w, "review");
  }

  function choose(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    const q = qs[i];
    if (idx === q.answer) {
      setCorrectN((n) => n + 1);
      if (source === "review") { removeWrong(q.sentence); setWrongN(getWrong().length); } // 複習答對 → 移出錯題本
    } else {
      setWrongSkills((m) => ({ ...m, [q.skill]: (m[q.skill] ?? 0) + 1 }));
      logErrors([q.skill], { expected: q.options[q.answer], said: q.options[idx], lessonId: "toeic" });
      addWrong(q); setWrongN(getWrong().length); // 加入錯題本
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

        {/* 作答 */}
        <div className="card mb-4 p-5">
          <div className="text-sm font-semibold text-slate-200">作答練習</div>
          <div className="mt-2 text-xs text-slate-500">優先考你最常錯的結構:</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {weak.length ? weak.map((w) => <span key={w} className="chip bg-red-500/15 text-[11px] text-red-400">{w}</span>) : <span className="text-xs text-slate-600">(還沒有弱點資料 → 一般出題)</span>}
          </div>
          <button onClick={startBank} className="btn-primary mt-4 w-full py-3">開始作答(題庫 6 題)</button>
          <button onClick={startAI} disabled={loading} className="btn-ghost mt-2 w-full py-2.5 text-sm">{loading ? "AI 出題中…" : "🤖 AI 針對弱點即時出題(需金鑰)"}</button>
        </div>

        {/* 複習專區 + 詳解專區 */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={startReview} disabled={wrongN === 0} className={`card p-4 text-left transition hover:border-accent/50 ${wrongN === 0 ? "opacity-50" : ""}`}>
            <div className="text-2xl">🔁</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">錯題複習專區</div>
            <div className="text-xs text-slate-500">{wrongN ? `${wrongN} 題待複習(答對移出)` : "目前沒有錯題"}</div>
          </button>
          <button onClick={() => { setExpSkill("全部"); setExpSearch(""); setExpMore(false); setPhase("explain"); }} className="card p-4 text-left transition hover:border-accent/50">
            <div className="text-2xl">📖</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">題庫詳解專區</div>
            <div className="text-xs text-slate-500">{TOEIC_BANK.length} 題,看正解 + 解析</div>
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-600">答錯的題會自動進「錯題複習專區」;答錯的題型也記進「分析 → 常錯結構」。</p>
      </Shell>
    );
  }

  // ── 詳解專區 ──
  if (phase === "explain") {
    const filtered = TOEIC_BANK.filter((q) =>
      (expSkill === "全部" || q.skill === expSkill) &&
      (!expSearch.trim() || q.sentence.toLowerCase().includes(expSearch.trim().toLowerCase())),
    );
    const shown = expMore ? filtered : filtered.slice(0, 40);
    return (
      <Shell>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">題庫詳解</h1>
          <button onClick={() => setPhase("intro")} className="btn-ghost px-3 py-1.5 text-xs">← 返回</button>
        </div>
        <input value={expSearch} onChange={(e) => { setExpSearch(e.target.value); setExpMore(false); }} placeholder="搜尋句子關鍵字…" className="mb-3 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent" />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {["全部", ...ALL_SKILLS].map((s) => (
            <button key={s} onClick={() => { setExpSkill(s); setExpMore(false); }} className={`chip text-[11px] ${expSkill === s ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>{s}</button>
          ))}
        </div>
        <div className="mb-2 text-xs text-slate-500">{filtered.length} 題</div>
        <ul className="space-y-2">
          {shown.map((q, k) => (
            <li key={k} className="card p-3.5">
              <div className="flex items-start gap-2">
                <span className="chip shrink-0 bg-ink-700 text-[10px] text-slate-400">{q.skill}</span>
                <span className="text-sm text-slate-100">{q.sentence.replace("____", `【${q.options[q.answer]}】`)}</span>
              </div>
              <div className="mt-1.5 text-xs text-accent">正解:{LETTERS[q.answer]}. {q.options[q.answer]}</div>
              {q.explanation && <div className="mt-0.5 text-xs text-slate-400">{q.explanation}</div>}
            </li>
          ))}
        </ul>
        {!expMore && filtered.length > shown.length && (
          <button onClick={() => setExpMore(true)} className="btn-ghost mt-3 w-full py-2.5 text-sm">顯示其餘 {filtered.length - shown.length} 題</button>
        )}
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
          <div className="mt-1 text-sm text-slate-400">正確率 {pct}% · {source === "review" ? "錯題複習" : "作答練習"}</div>
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
            <button onClick={source === "review" ? startReview : startBank} disabled={source === "review" && wrongN === 0} className="btn-primary flex-1">{source === "review" ? "繼續複習" : "再來一組"}</button>
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
        <span className="text-sm text-slate-400"><span className="chip mr-2 bg-accent/15 text-accent">{source === "review" ? "錯題複習" : "Part 5"}</span>第 {i + 1} / {qs.length} 題</span>
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
