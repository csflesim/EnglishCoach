"use client";

import { useState, useEffect, useRef } from "react";
import Shell from "@/components/Shell";
import {
  learner,
  learningPath,
  getLesson,
  buildSession,
  framesOf,
  availableModes,
  subFrameCount,
  transformExample,
  transformOpCount,
  drillTypeZh,
  type DrillType,
  type Step,
} from "@/lib/mock";
import { initProgress, markMode, lessonProgress, recommendNextLessonId, type ProgressMap } from "@/lib/progress";
import { initContent } from "@/lib/content";
import { transcribe, evaluate, type EvalResult } from "@/lib/ai";
import { logReview } from "@/lib/review";

type Mode = "home" | "select" | "selectSub" | "selectTransFrame" | "selectOp" | "running" | "complete";
type RunPhase = "groupIntro" | "cue" | "listening" | "speaking" | "reveal";

const SILENCE_MS = 900;
const MIN_SPEECH_MS = 250;
const START_THRESH = 0.045;
const SILENCE_THRESH = 0.03;

// 估計一句話的朗讀時長（當 onend 沒觸發時的保險 / 關語音時的閱讀停頓）
function estMs(text: string, lang?: string) {
  if (lang?.startsWith("zh")) return Math.max(900, text.length * 240);
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
  return Math.max(900, words * 400);
}

// 情境反應 (Response) 先關閉
const MODES: { type: DrillType; desc: string }[] = [
  { type: "Substitution", desc: "句型固定，從單字庫高頻替換，再延伸句框" },
  { type: "Transformation", desc: "同一句套用變換(下一層選 過去／否定／疑問)" },
  { type: "Expansion", desc: "從前面找一句來擴，每次不同" },
];

function tier(s: number) {
  return s < 1.5 ? "Excellent" : s < 3 ? "Good" : s < 6 ? "Learning" : "Weak";
}
const tierColor: Record<string, string> = {
  Excellent: "text-accent",
  Good: "text-accent",
  Learning: "text-gold",
  Weak: "text-red-400",
};

export default function TrainingPage() {
  const [mode, setMode] = useState<Mode>("home");
  const [selectedId, setSelectedId] = useState(learner.todayLessonId);
  const [drillType, setDrillType] = useState<DrillType>("Substitution");
  const [selectedOp, setSelectedOp] = useState<string | undefined>(undefined);
  const [selectedFrame, setSelectedFrame] = useState<string | undefined>(undefined);
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<RunPhase>("cue");
  const [liveTimer, setLiveTimer] = useState(0);
  const [reaction, setReaction] = useState(0);
  const [paused, setPaused] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [useMic, setUseMic] = useState(true);
  const [micError, setMicError] = useState(false);
  const [echoLoop, setEchoLoop] = useState(false);
  const [echoStep, setEchoStep] = useState<"t1" | "t1echo" | "nat" | "t2" | "t2echo" | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [, setContentTick] = useState(0);
  const [aiOn, setAiOn] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [aiResult, setAiResult] = useState<(EvalResult & { transcript?: string }) | null>(null);
  const [markedMsg, setMarkedMsg] = useState("");
  const progressRef = useRef<ProgressMap>({});
  progressRef.current = progress;
  const aiRef = useRef(false);
  aiRef.current = aiOn;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const timeoutsRef = useRef<number[]>([]);
  const startRef = useRef(0);
  const stepsRef = useRef<Step[]>([]);
  const timesRef = useRef<number[]>([]);
  const phaseRef = useRef<RunPhase>("cue");
  const idxRef = useRef(0);
  const listenStartRef = useRef(0);
  const speakStartRef = useRef(0);
  const lastVoiceRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const audioRef = useRef(true);
  const micRef = useRef(true);
  const echoRef = useRef(false);
  audioRef.current = audioOn;
  micRef.current = useMic && !micError;
  echoRef.current = echoLoop;
  phaseRef.current = phase;
  idxRef.current = idx;

  const lesson = getLesson(selectedId);
  const step = steps[idx];
  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;

  // ── TTS ──
  function speak(text: string, opts?: { lang?: string; onend?: () => void }) {
    const onend = opts?.onend;
    if (!audioRef.current) { if (onend) onend(); return; }
    try {
      const s = window.speechSynthesis;
      if (!s) { if (onend) onend(); return; }
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts?.lang ?? "en-US";
      u.rate = opts?.lang?.startsWith("zh") ? 1.0 : 0.95;
      if (onend) u.onend = onend;
      s.speak(u);
    } catch { if (onend) onend(); }
  }
  function clearTimers() {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }
  function schedule(fn: () => void, ms: number) {
    timeoutsRef.current.push(window.setTimeout(fn, ms));
  }

  // 唸完整句（等 onend）才執行 after；長句不會被切斷。fallback 只在 onend 失靈時兜底。
  function speakThen(text: string, lang: string, after: () => void) {
    if (!audioRef.current) {
      schedule(after, Math.min(2200, estMs(text, lang)));
      return;
    }
    let done = false;
    const go = (gap: number) => {
      if (done) return;
      done = true;
      schedule(after, gap);
    };
    speak(text, { lang, onend: () => go(300) });
    schedule(() => go(0), estMs(text, lang) + 2500); // 保險
  }

  async function initMic(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      ctxRef.current = ctx;
      analyserRef.current = an;
      dataRef.current = new Uint8Array(an.fftSize);
      return true;
    } catch { return false; }
  }
  function closeMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
  }
  function volume(): number {
    const an = analyserRef.current;
    const data = dataRef.current;
    if (!an || !data) return 0;
    an.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const x = (data[i] - 128) / 128;
      sum += x * x;
    }
    return Math.sqrt(sum / data.length);
  }

  function loop() {
    const p = phaseRef.current;
    if (p !== "listening" && p !== "speaking") { rafRef.current = null; return; }
    const now = performance.now();
    const vol = volume();
    if (p === "listening") {
      setLiveTimer((now - listenStartRef.current) / 1000);
      if (vol > START_THRESH) {
        setReaction((now - listenStartRef.current) / 1000);
        speakStartRef.current = now;
        lastVoiceRef.current = now;
        setPhase("speaking");
        phaseRef.current = "speaking";
      }
    } else {
      if (vol > SILENCE_THRESH) lastVoiceRef.current = now;
      if (now - speakStartRef.current > MIN_SPEECH_MS && now - lastVoiceRef.current > SILENCE_MS) {
        endSpeaking();
        return;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── 每一發 ──
  function runStep(i: number) {
    const arr = stepsRef.current;
    if (i >= arr.length) { finish(); return; }
    setIdx(i);
    idxRef.current = i;
    const cur = arr[i];
    const prev = i > 0 ? arr[i - 1] : null;
    const newGroup = cur.groupKey && (!prev || prev.groupKey !== cur.groupKey);
    if (newGroup) {
      setPhase("groupIntro");
      phaseRef.current = "groupIntro";
      if (cur.groupSpeak) speakThen(cur.groupSpeak, "en-US", () => startCue(i));
      else schedule(() => startCue(i), 1400);
    } else {
      startCue(i);
    }
  }

  function startCue(i: number) {
    const cur = stepsRef.current[i];
    setPhase("cue");
    phaseRef.current = "cue";
    setLiveTimer(0);
    setReaction(0);
    const begin = () => startListening();
    if (cur.type !== "Expansion") {
      // 等 cue 唸完才開始聽（避免麥克風收到 TTS、也避免 cue 被切）
      speakThen(cur.cue, "en-US", begin);
    } else {
      schedule(begin, 700);
    }
  }

  function startListening() {
    if (phaseRef.current !== "cue") return;
    listenStartRef.current = performance.now();
    lastVoiceRef.current = performance.now();
    setPhase("listening");
    phaseRef.current = "listening";
    if (micRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
      // AI 評分:錄下這次回答的音訊
      if (aiRef.current && streamRef.current) {
        try {
          const rec = new MediaRecorder(streamRef.current);
          chunksRef.current = [];
          rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
          recorderRef.current = rec;
          rec.start();
        } catch {
          recorderRef.current = null;
        }
      }
    }
  }
  function manualStart() {
    if (phaseRef.current !== "listening") return;
    setReaction((performance.now() - listenStartRef.current) / 1000);
    setPhase("speaking");
    phaseRef.current = "speaking";
  }
  function endSpeaking() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    timesRef.current.push(reaction || (performance.now() - listenStartRef.current) / 1000);
    setPhase("reveal");
    phaseRef.current = "reveal";
    setEchoStep(null);
    setAiResult(null);
    const cur = stepsRef.current[idxRef.current];
    const rec = recorderRef.current;
    if (aiRef.current && micRef.current && rec && rec.state !== "inactive") {
      setScoring(true);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const text = await transcribe(blob);
        let res: EvalResult | null = null;
        if (text) res = await evaluate({ pattern: lessonRef.current.patternText, expected: cur.answer, transcript: text, drillType: cur.type });
        setScoring(false);
        setAiResult(res ? { ...res, transcript: text ?? "" } : null);
        if (res && !res.correct) logRep(cur, "wrong");
        revealAndContinue(cur);
      };
      try { rec.stop(); } catch { setScoring(false); revealAndContinue(cur); }
    } else {
      revealAndContinue(cur);
    }
  }
  function revealAndContinue(cur: Step) {
    if (echoRef.current && cur.nativeZh) {
      runEcho(cur.answer, cur.nativeZh);
    } else {
      setEchoStep(null);
      speakThen(cur.answer, "en-US", () => runStep(idxRef.current + 1));
    }
  }
  function runEcho(answer: string, native: string) {
    // Target(英) → [你覆述] → Native(母語) → Target(英) → [你覆述] → 下一發
    const repeatMs = Math.max(1600, estMs(answer, "en-US")); // 留給你自己唸一遍的時間
    setEchoStep("t1");
    speakThen(answer, "en-US", () => {
      setEchoStep("t1echo"); // 換你覆述
      schedule(() => {
        setEchoStep("nat");
        speakThen(native, "zh-TW", () => {
          setEchoStep("t2");
          speakThen(answer, "en-US", () => {
            setEchoStep("t2echo"); // 換你覆述
            schedule(() => {
              setEchoStep(null);
              runStep(idxRef.current + 1);
            }, repeatMs);
          });
        });
      }, repeatMs);
    });
  }
  // 寫入複習紀錄(只記答錯 / 標記不熟):句子 + (替換時)單字
  function logRep(cur: Step, event: "wrong" | "unknown") {
    const lid = lessonRef.current?.id ?? selectedId;
    logReview({ kind: "sentence", ref: `sent:${lid}:${cur.answer}`, text: cur.answer, nativeZh: cur.nativeZh, patternId: lid, event });
    if (cur.type === "Substitution" && cur.cue) logReview({ kind: "word", ref: `word:${cur.cue.toLowerCase()}`, text: cur.cue, nativeZh: "", patternId: lid, event });
  }
  function markCurrentUnknown() {
    const cur = stepsRef.current[idxRef.current];
    if (cur) { logRep(cur, "unknown"); setMarkedMsg("已加入複習"); schedule(() => setMarkedMsg(""), 1500); }
  }

  function finish() {
    clearTimers();
    try { window.speechSynthesis?.cancel(); } catch {}
    closeMic();
    setDurationSec((Date.now() - startRef.current) / 1000);
    // 記錄完成的模式 → 推進學習地圖
    const np = markMode(progressRef.current, selectedId, drillType);
    setProgress(np);
    progressRef.current = np;
    setMode("complete");
  }

  function openLesson(id: string) {
    setSelectedId(id);
    setMode("select");
  }
  async function startSession(type: DrillType, opKey?: string, frameKey?: string) {
    setSelectedOp(opKey);
    setSelectedFrame(frameKey);
    const s = buildSession(getLesson(selectedId), type, opKey, frameKey);
    stepsRef.current = s;
    timesRef.current = [];
    setSteps(s);
    setDrillType(type);
    setMode("running");
    setPaused(false);
    setEchoStep(null);
    startRef.current = Date.now();
    if (useMic) {
      const ok = await initMic();
      setMicError(!ok);
      micRef.current = ok;
    }
    runStep(0);
  }
  function togglePause() {
    if (paused) { setPaused(false); runStep(idxRef.current); }
    else { setPaused(true); clearTimers(); try { window.speechSynthesis?.cancel(); } catch {} }
  }
  function stop() {
    clearTimers();
    try { window.speechSynthesis?.cancel(); } catch {}
    closeMic();
    setMode("select");
  }
  useEffect(() => () => { clearTimers(); closeMic(); }, []);
  useEffect(() => { initProgress().then(setProgress); }, []);
  useEffect(() => { initContent().then(() => setContentTick((t) => t + 1)); }, []);

  // ─────────── HOME ───────────
  if (mode === "home") {
    const orderedIds = learningPath.flatMap((c) => c.units.filter((u) => u.lessonId).map((u) => u.lessonId!));
    const todayId = recommendNextLessonId(progress, orderedIds);
    const masteredN = orderedIds.filter((id) => lessonProgress(progress, getLesson(id)).mastered).length;
    return (
      <Shell>
        <div className="mb-5">
          <p className="text-sm text-slate-500">特工 {learner.codename} · 第 {learner.cycle} 週期 · 估計 CLB {learner.estClb}</p>
          <h1 className="mt-1 text-2xl font-bold">準備好建立反射了嗎？</h1>
          <p className="mt-1 text-xs text-slate-500">已掌握 {masteredN} / 30 單元</p>
        </div>

        <button onClick={() => openLesson(todayId)} className="block w-full overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-ink-900 p-6 text-left transition hover:border-accent/70">
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">下一步 · Next Up</div>
          <div className="mt-1 text-2xl font-bold text-slate-100">{getLesson(todayId).patternText}</div>
          <div className="mt-2 text-xs text-slate-500">Unit {getLesson(todayId).unit} · 點選 → 選模式操練</div>
          <span className="btn-primary mt-4">▶ 繼續學習</span>
        </button>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">學習路徑 · FSI 30 單元</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={useMic} onChange={(e) => setUseMic(e.target.checked)} className="h-3.5 w-3.5 accent-[#39d0a3]" />🎤</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={audioOn} onChange={(e) => setAudioOn(e.target.checked)} className="h-3.5 w-3.5 accent-[#39d0a3]" />🔊</label>
              <label className="flex items-center gap-1.5" title="正解後加跑 英→母語→英"><input type="checkbox" checked={echoLoop} onChange={(e) => setEchoLoop(e.target.checked)} className="h-3.5 w-3.5 accent-[#39d0a3]" />🔁</label>
              <label className="flex items-center gap-1.5" title="用 AI 聽你說、評分糾錯(需設定 OpenAI 金鑰、會產生費用)"><input type="checkbox" checked={aiOn} onChange={(e) => setAiOn(e.target.checked)} className="h-3.5 w-3.5 accent-[#39d0a3]" />🤖</label>
            </div>
          </div>
          <div className="space-y-4">
            {learningPath.map((c) => (
              <div key={c.cycle} className="card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{c.title}</span>
                  <span className="chip ml-auto bg-ink-700 text-[10px] text-slate-400">{c.clb}</span>
                </div>
                <ul className="space-y-1.5">
                  {c.units.map((u) => {
                    const ready = !!u.lessonId;
                    const lp = ready ? lessonProgress(progress, getLesson(u.lessonId!)) : null;
                    const isNext = ready && u.lessonId === todayId;
                    return (
                      <li key={u.unit} onClick={() => ready && openLesson(u.lessonId!)} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${ready ? "cursor-pointer hover:bg-ink-800" : ""} ${isNext ? "ring-1 ring-accent/40" : ""}`}>
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-bold ${lp?.mastered ? "bg-accent text-ink-950" : ready ? "bg-accent/15 text-accent" : "bg-ink-800 text-slate-600"}`}>{lp?.mastered ? "✓" : u.unit}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className={`text-sm font-medium ${ready ? "text-slate-100" : "text-slate-400"}`}>{u.goal}</span><span className="truncate text-[11px] text-slate-600">{u.focus}</span></div>
                          <code className={`text-xs ${ready ? "text-accent" : "text-slate-600"}`}>{u.pattern}</code>
                        </div>
                        {ready ? (
                          <span className={`chip shrink-0 text-[10px] ${lp?.mastered ? "bg-accent/15 text-accent" : "bg-ink-700 text-slate-300"}`}>{lp?.mastered ? "已掌握" : isNext ? `下一步 ${lp?.done}/${lp?.total}` : `${lp?.done}/${lp?.total}`}</span>
                        ) : (
                          <span className="chip shrink-0 bg-ink-800 text-[10px] text-slate-600">建置中</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────── SELECT 模式 ───────────
  if (mode === "select") {
    return (
      <Shell>
        <button onClick={() => setMode("home")} className="mb-4 text-sm text-slate-500 hover:text-slate-300">← 返回</button>
        <div className="mb-5">
          <div className="text-xs text-slate-500">核心句型</div>
          <h1 className="text-2xl font-bold text-accent">{lesson.patternText}</h1>
          <p className="mt-1 text-sm text-slate-500">選一種模式專注操練(一次一式)</p>
        </div>
        <div className="space-y-3">
          {MODES.filter((m) => availableModes(lesson).includes(m.type)).map((m, i) => {
            const isSub = m.type === "Substitution";
            const isTrans = m.type === "Transformation";
            const hasSecond = isSub || isTrans;
            const countLabel = isSub ? `${framesOf(lesson).length} 個句框` : isTrans ? `${lesson.transformation.length} 種變換` : "每次不同";
            const onClick = isSub ? () => setMode("selectSub") : isTrans ? () => setMode("selectTransFrame") : () => startSession(m.type);
            return (
              <button key={m.type} onClick={onClick} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-100">{drillTypeZh[m.type]} <span className="text-xs font-normal text-slate-600">{m.type}</span></div>
                  <div className="text-xs text-slate-500">{m.desc}</div>
                </div>
                <span className="chip shrink-0 bg-ink-700 text-slate-300">{countLabel}{hasSecond ? " ›" : ""}</span>
              </button>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ─────────── SELECT 替換句框（第二層）───────────
  if (mode === "selectSub") {
    return (
      <Shell>
        <button onClick={() => setMode("select")} className="mb-4 text-sm text-slate-500 hover:text-slate-300">← 返回</button>
        <div className="mb-5">
          <div className="text-xs text-slate-500">替換 · {lesson.patternText}</div>
          <h1 className="text-xl font-bold text-slate-100">選一個句框</h1>
          <p className="mt-1 text-sm text-slate-500">換一小部分 → 再延伸，由淺到深</p>
        </div>
        <div className="space-y-3">
          {framesOf(lesson).map((f, i) => (
            <button key={f.frame} onClick={() => startSession("Substitution", f.frame)} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <code className="text-base font-semibold text-slate-100">{f.frame}</code>
              </div>
              <span className="chip shrink-0 bg-ink-700 text-slate-300">{subFrameCount(f)} 發</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  // ─────────── SELECT 轉換句框（第二層之一）───────────
  if (mode === "selectTransFrame") {
    return (
      <Shell>
        <button onClick={() => setMode("select")} className="mb-4 text-sm text-slate-500 hover:text-slate-300">← 返回</button>
        <div className="mb-5">
          <div className="text-xs text-slate-500">轉換 · {lesson.patternText}</div>
          <h1 className="text-xl font-bold text-slate-100">先選要變換哪個句框</h1>
        </div>
        <div className="space-y-3">
          {framesOf(lesson).map((f, i) => (
            <button key={f.frame} onClick={() => { setSelectedFrame(f.frame); setMode("selectOp"); }} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <code className="text-base font-semibold text-slate-100">{f.frame}</code>
              </div>
              <span className="chip shrink-0 bg-ink-700 text-slate-300">{subFrameCount(f)} 句</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  // ─────────── SELECT 轉換操作（第二層之二）───────────
  if (mode === "selectOp") {
    const frameText = selectedFrame ?? framesOf(lesson)[0]?.frame;
    return (
      <Shell>
        <button onClick={() => setMode("selectTransFrame")} className="mb-4 text-sm text-slate-500 hover:text-slate-300">← 返回</button>
        <div className="mb-5">
          <div className="text-xs text-slate-500">轉換 · <code className="text-slate-300">{frameText}</code></div>
          <h1 className="text-xl font-bold text-slate-100">選一種變換操作</h1>
        </div>
        <div className="space-y-3">
          {lesson.transformation.map((o) => {
            const ex = transformExample(lesson, o, selectedFrame);
            return (
              <button key={o.op} onClick={() => startSession("Transformation", o.op, selectedFrame)} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-100">{o.instruction}</div>
                  <div className="text-xs text-slate-500">例：{ex.cue} → {ex.answer}</div>
                </div>
                <span className="chip shrink-0 bg-ink-700 text-slate-300">{transformOpCount(lesson, selectedFrame)} 發</span>
              </button>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ─────────── COMPLETE ───────────
  if (mode === "complete") {
    const mm = Math.floor(durationSec / 60);
    const ss = Math.round(durationSec % 60).toString().padStart(2, "0");
    const times = timesRef.current;
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const fastest = times.length ? Math.min(...times) : 0;
    return (
      <Shell>
        <div className="card p-8 text-center">
          <div className="text-5xl">🎯</div>
          <h2 className="mt-3 text-2xl font-bold">{drillTypeZh[drillType]}完成！</h2>
          <p className="mt-1 text-sm text-slate-400">{lesson.patternText}</p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3"><div className="text-2xl font-black text-slate-100">{stepsRef.current.length}</div><div className="text-xs text-slate-500">完成發數</div></div>
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3"><div className="text-2xl font-black text-accent">{avg ? avg.toFixed(1) : "—"}s</div><div className="text-xs text-slate-500">平均反應</div></div>
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3"><div className="text-2xl font-black text-accent">{fastest ? fastest.toFixed(1) : "—"}s</div><div className="text-xs text-slate-500">最快</div></div>
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3"><div className="text-2xl font-black text-slate-100">{mm}:{ss}</div><div className="text-xs text-slate-500">用時</div></div>
          </div>
          <div className="mx-auto mt-6 flex max-w-sm gap-2">
            <button onClick={() => startSession(drillType, selectedOp, selectedFrame)} className="btn-ghost flex-1">再練一次</button>
            <button onClick={() => setMode("select")} className="btn-primary flex-1">換個模式</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────── RUNNING ───────────
  const topPattern = drillType === "Substitution" ? step?.groupKey ?? lesson.patternText : lesson.patternText;
  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-400"><span className="chip mr-2 bg-accent/15 text-accent">{drillTypeZh[drillType]}</span>第 {idx + 1} / {steps.length} 發</span>
        <button onClick={stop} className="btn-ghost px-3 py-1.5 text-xs">停止</button>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${(idx / steps.length) * 100}%` }} />
      </div>

      <div className="mb-4 text-center">
        <span className="chip bg-accent/15 text-accent">句型：{topPattern}</span>
      </div>

      <div className="card flex min-h-[320px] flex-col items-center justify-center gap-4 p-6 text-center">
        {paused ? (
          <>
            <div className="text-2xl font-bold text-slate-400">已暫停</div>
            <button onClick={togglePause} className="btn-primary px-8 py-3">▶ 繼續</button>
          </>
        ) : phase === "groupIntro" ? (
          <>
            <div className="text-xs uppercase tracking-widest text-accent">{drillType === "Substitution" ? "新句型 New Frame" : "新操作 New Operation"}</div>
            <div className="text-2xl font-bold text-slate-100">{step?.groupTitle}</div>
            <div className="text-sm text-slate-500">{drillType === "Substitution" ? "🔊 跟我唸這個句型" : "接下來都做這個變換"}</div>
          </>
        ) : phase === "cue" ? (
          <>
            <div className="text-xs uppercase tracking-widest text-slate-600">{step?.type === "Transformation" ? "改寫這句" : step?.type === "Response" ? "聽問題" : step?.type === "Expansion" ? "加進這個" : "替換提示 (Cue)"}</div>
            <div className="text-3xl font-bold text-gold">{step?.cue}</div>
            <div className="text-sm text-slate-500">🔊 播放提示中…</div>
          </>
        ) : phase === "listening" ? (
          <>
            <div className="text-xs uppercase tracking-widest text-slate-600">{step?.type === "Response" ? "直覺回答" : "現在開口！"}</div>
            <div className="text-3xl font-bold text-gold">{step?.cue}</div>
            <div className={`text-4xl font-black tabular-nums ${liveTimer > 3 ? "text-red-400" : liveTimer > 1.5 ? "text-gold" : "text-accent"}`}>{liveTimer.toFixed(1)}s</div>
            <div className="text-xs text-slate-500">⏱ 反應速度計時中（3 秒內開口為佳，不會打斷你）</div>
            {micRef.current ? (
              <div className="flex items-center gap-2 text-sm text-accent"><span className="text-lg">🎙</span> 偵測中…大聲說出完整句子</div>
            ) : (
              <button onClick={manualStart} className="btn-primary px-8 py-3">我開始說了</button>
            )}
          </>
        ) : phase === "speaking" ? (
          <>
            <div className="text-xs uppercase tracking-widest text-accent">聆聽你的回答中</div>
            <div className="text-3xl font-bold text-gold">{step?.cue}</div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="flex gap-0.5"><span className="h-4 w-1 animate-pulse rounded bg-accent" /><span className="h-5 w-1 animate-pulse rounded bg-accent [animation-delay:120ms]" /><span className="h-3 w-1 animate-pulse rounded bg-accent [animation-delay:240ms]" /></span>
              說完即可，我不會打斷你
            </div>
            <div className="text-xs text-slate-500">反應速度：<span className={tierColor[tier(reaction)]}>{reaction.toFixed(1)}s · {tier(reaction)}</span></div>
            {!micRef.current && <button onClick={endSpeaking} className="btn-primary px-8 py-3">說完了 →</button>}
          </>
        ) : echoStep ? (
          <>
            {echoStep === "t1echo" || echoStep === "t2echo" ? (
              <div className="text-xs uppercase tracking-widest text-gold">🎙 換你說一遍</div>
            ) : (
              <div className="text-xs uppercase tracking-widest text-accent">🔁 Echo Loop · 跟著唸</div>
            )}
            <div className={`text-2xl font-semibold transition ${echoStep === "nat" ? "text-slate-500" : "text-accent"}`}>“{step?.answer}”</div>
            <div className={`text-xl font-medium transition ${echoStep === "nat" ? "text-gold" : "text-slate-600"}`}>{step?.nativeZh}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className={echoStep === "t1" || echoStep === "t1echo" ? "text-accent" : "text-slate-600"}>Target{echoStep === "t1echo" ? " 🎙" : ""}</span><span className="text-slate-700">›</span>
              <span className={echoStep === "nat" ? "text-gold" : "text-slate-600"}>母語</span><span className="text-slate-700">›</span>
              <span className={echoStep === "t2" || echoStep === "t2echo" ? "text-accent" : "text-slate-600"}>Target{echoStep === "t2echo" ? " 🎙" : ""}</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-xs uppercase tracking-widest text-slate-600">{step?.type === "Response" ? "示範答法 · 跟著說" : "正解 · 跟著複誦"}</div>
            <div className="text-2xl font-semibold text-accent">“{step?.answer}”</div>
            {step?.nativeZh && <div className="text-sm text-slate-500">{step.nativeZh}</div>}
            <div className="text-sm text-slate-400">你的反應：<span className={tierColor[tier(reaction)]}>{reaction.toFixed(1)}s · {tier(reaction)}</span></div>
            {scoring && <div className="mt-1 text-sm text-slate-400 animate-pulse">🤖 AI 評分中…</div>}
            {aiResult && (
              <div className="mt-2 w-full max-w-md rounded-xl border border-ink-700 bg-ink-900/40 p-3 text-left text-sm">
                <div className="mb-1 text-xs text-slate-500">你說的：<span className="text-slate-300">“{aiResult.transcript || "(聽不清)"}”</span></div>
                <div className="flex items-center gap-2">
                  <span className={aiResult.correct ? "chip bg-accent/15 text-accent" : "chip bg-red-500/15 text-red-400"}>{aiResult.correct ? "✓ 正確" : "✗ 再修正"}</span>
                  <span className="text-xs text-slate-500">準確 {aiResult.accuracy} · 文法 {aiResult.grammar} · 流暢 {aiResult.fluency}</span>
                </div>
                <div className="mt-1.5 text-slate-200">{aiResult.feedback}</div>
                {aiResult.weakness && aiResult.weakness !== "無" && <div className="mt-1 text-xs text-gold">弱點：{aiResult.weakness}</div>}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button onClick={togglePause} className="btn-ghost">{paused ? "▶ 繼續" : "⏸ 暫停"}</button>
        <button onClick={() => setAudioOn((v) => !v)} className="btn-ghost">{audioOn ? "🔊 語音開" : "🔇 語音關"}</button>
        <button onClick={markCurrentUnknown} className="btn-ghost text-red-400">✗ 不熟</button>
      </div>
      {markedMsg && <p className="mt-2 text-center text-xs text-accent">{markedMsg}</p>}
      {micError && <p className="mt-3 text-center text-xs text-gold">麥克風無法使用，已切換為手動模式。</p>}
      <p className="mt-3 text-center text-xs text-slate-600">3 秒只是反應速度參考線，不是答案倒數。你開口後，說完才會出正解。</p>
    </Shell>
  );
}
