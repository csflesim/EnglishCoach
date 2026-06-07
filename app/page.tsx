"use client";

import { useState, useEffect, useRef } from "react";
import Shell from "@/components/Shell";
import {
  learner,
  learningPath,
  getLesson,
  buildSession,
  framesOf,
  frameDisplay,
  candidateWords,
  availableModes,
  transformFrames,
  transformExample,
  drillTypeZh,
  PERSON_ORDER,
  TRANSFORM_OPS,
  opLabel,
  setSelectionContext,
  type DrillType,
  type Step,
  type PKey,
} from "@/lib/mock";
import { initProgress, markSession, lessonProgress, modeProgress, frameProgress, isSubDone, isTransDone, recommendNextLessonId, type ProgressMap } from "@/lib/progress";
import { initContent, getActiveWordbook, getComboChecks, recordChecks, logErrors } from "@/lib/content";
import { transcribe, checkFrame, sessionReview, type EvalResult, type SessionReview } from "@/lib/ai";
import { logReview, getWordReviewMap, getDrillReviewMap, drillKey, repCountForBox, logDrill, type DrillReview } from "@/lib/review";
import { logSession } from "@/lib/practice";
import { localJudge } from "@/lib/match";
import { patternsByTier, SP_BASIC, SP_APPLIED, type SentencePattern } from "@/lib/sentencePatterns";

type Mode = "home" | "select" | "selectSub" | "selectSubPerson" | "selectTransFrame" | "selectOp" | "running" | "complete";
type RunPhase = "groupIntro" | "cue" | "listening" | "speaking" | "reveal";
// 背景 AI 模式:練習時只收集每發,整輪結束後一次評分分析
type SessionRep = { i: number; cue: string; expected: string; said: string; type: DrillType; pattern: string; nativeZh?: string };

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
  const [showSettings, setShowSettings] = useState(false);
  const [trainMode, setTrainMode] = useState<"fsi" | "sentence">("fsi"); // 訓練分層:FSI模式 / 句型模式
  const [sentenceTier, setSentenceTier] = useState<"basic" | "applied">("basic");
  const patternModeRef = useRef<SentencePattern | null>(null); // 非 null = 句型模式,finish 時略過 FSI 進度
  const [selectedId, setSelectedId] = useState(learner.todayLessonId);
  const [drillType, setDrillType] = useState<DrillType>("Substitution");
  const [selectedOp, setSelectedOp] = useState<string | undefined>(undefined);
  const [selectedFrame, setSelectedFrame] = useState<string | undefined>(undefined);
  const [selectedPerson, setSelectedPerson] = useState<PKey | "all">("I");
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<RunPhase>("cue");
  const [liveTimer, setLiveTimer] = useState(0);
  const [reaction, setReaction] = useState(0);
  const reactionRef = useRef(0); // 反應時間(開口那刻)— 供 endSpeaking 讀最新值,避免閉包讀到舊 state
  // 設定反應時間(只記第一次開口,單位秒);同步 state(顯示)與 ref(邏輯)
  function markReaction(sec: number) { reactionRef.current = sec; setReaction(sec); }
  const [paused, setPaused] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [useMic, setUseMic] = useState(true);
  const [micError, setMicError] = useState(false);
  const [echoLoop, setEchoLoop] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false); // 提示時是否顯示中文(預設關)
  const [aiFilterOn, setAiFilterOn] = useState(true); // 選詞時 AI 過濾不通組合(需金鑰,判過不重判;無金鑰自動略過)
  const [webSpeechOn, setWebSpeechOn] = useState(true); // 瀏覽器即時辨識(免費)
  const [localMatchOn, setLocalMatchOn] = useState(true); // 本地比對判對錯(免費;AI 關時生效)
  const [heardText, setHeardText] = useState(""); // 即時辨識到的文字
  const [echoStep, setEchoStep] = useState<"t1" | "t1echo" | "nat" | "t2" | "t2echo" | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [, setContentTick] = useState(0);
  const [aiOn, setAiOn] = useState(false);
  const [aiResult, setAiResult] = useState<(EvalResult & { transcript?: string }) | null>(null);
  const [markedMsg, setMarkedMsg] = useState("");
  const [sessionAi, setSessionAi] = useState<SessionReview | null>(null);
  const [sessionAiLoading, setSessionAiLoading] = useState(false);
  const [sessionAiMsg, setSessionAiMsg] = useState("");
  const [sessionVerdicts, setSessionVerdicts] = useState<{ correct: boolean; errors: string[] }[]>([]); // 每發對錯(與 reps 對齊)
  const repsRef = useRef<SessionRep[]>([]); // 本輪收集的每一發(供結束後 AI 分析)
  const batchDoneRef = useRef(false); // 防止整輪分析重複執行
  // 本輪設定(同步寫入,供 finish 讀取 — 避免 finish 在舊閉包讀到尚未更新的 state)
  const sessionMetaRef = useRef<{ lessonId: string; mode: DrillType; frame?: string; person?: PKey | "all"; op?: string }>({ lessonId: "", mode: "Substitution" });
  const progressRef = useRef<ProgressMap>({});
  progressRef.current = progress;
  const aiRef = useRef(false);
  aiRef.current = aiOn;
  const recorderRef = useRef<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null); // Web Speech 即時辨識
  const liveTranscriptRef = useRef("");
  const webSpeechActiveRef = useRef(false); // 本發是否真的啟用了 Web Speech(支援才有)
  const webSpeechOnRef = useRef(true);
  webSpeechOnRef.current = webSpeechOn;
  const localMatchRef = useRef(true);
  localMatchRef.current = localMatchOn;
  const chunksRef = useRef<Blob[]>([]);
  const drillReviewRef = useRef<Map<string, DrillReview>>(new Map()); // drill gap 狀態
  const sessionErrorRef = useRef(false); // 本輪是否有答錯/標不熟
  const repWordMarkedRef = useRef(false); // 本發單字是否已標(不熟/錯)→ 不再記「答對」
  const badCombosRef = useRef<Set<string>>(new Set()); // 不通的 句框|單字 組合
  const checkedCombosRef = useRef<Set<string>>(new Set()); // 已判斷過的組合(好壞都算)
  const aiFilterRef = useRef(false);
  aiFilterRef.current = aiFilterOn;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webSpeechSupported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const wsMode = webSpeechOn && webSpeechSupported; // 用 Web Speech 即時辨識(就不開 VAD,避免搶麥)

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
  // iOS/手機:必須在使用者點擊當下先「解鎖」語音,之後計時器/async 才能播
  function unlockTTS() {
    try {
      const s = window.speechSynthesis;
      if (!s) return;
      s.resume();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      s.speak(u);
      s.getVoices();
    } catch {}
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
        markReaction((now - listenStartRef.current) / 1000);
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
    repWordMarkedRef.current = false; // 新的一發
    setPhase("cue");
    phaseRef.current = "cue";
    setLiveTimer(0);
    reactionRef.current = 0;
    setReaction(0);
    const begin = () => startListening();
    if (cur.type !== "Expansion") {
      // 等 cue 唸完才開始聽（避免麥克風收到 TTS、也避免 cue 被切）
      speakThen(cur.cue, "en-US", begin);
    } else {
      schedule(begin, 700);
    }
  }

  // Web Speech 自己處理:開始說(計反應)→ 即時辨識 → 說完(onend)自動結束
  function startWebSpeech() {
    webSpeechActiveRef.current = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      liveTranscriptRef.current = "";
      setHeardText("");
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = false; // 收一句、靜默後自動結束
      // 第一個開口訊號(onspeechstart 或第一筆辨識結果,擇先到者)→ 記反應時間
      const markStart = () => {
        if (phaseRef.current === "listening") {
          markReaction((performance.now() - listenStartRef.current) / 1000);
          setPhase("speaking");
          phaseRef.current = "speaking";
        }
      };
      rec.onspeechstart = markStart;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        markStart(); // iOS 上 onspeechstart 常不觸發,改用第一筆結果當作開口時刻
        let t = "";
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        liveTranscriptRef.current = t;
        setHeardText(t);
      };
      rec.onerror = () => {};
      rec.onend = () => {
        // 有講到話才自動結束;沒講到就等使用者按「說完了」
        if ((phaseRef.current === "listening" || phaseRef.current === "speaking") && liveTranscriptRef.current.trim()) endSpeaking();
      };
      recognitionRef.current = rec;
      rec.start();
      webSpeechActiveRef.current = true;
    } catch { recognitionRef.current = null; }
  }
  function stopWebSpeech() {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  }
  function startListening() {
    if (phaseRef.current !== "cue") return;
    listenStartRef.current = performance.now();
    lastVoiceRef.current = performance.now();
    setPhase("listening");
    phaseRef.current = "listening";
    if (wsMode) { startWebSpeech(); return; } // Web Speech 模式:不開 VAD,避免搶麥
    if (micRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
      // AI 評分(Whisper 回合制):錄下這次回答的音訊
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
    markReaction((performance.now() - listenStartRef.current) / 1000);
    setPhase("speaking");
    phaseRef.current = "speaking";
  }
  function endSpeaking() {
    if (phaseRef.current !== "listening" && phaseRef.current !== "speaking") return; // 防重複(onend + 手動)
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    timesRef.current.push(reactionRef.current || (performance.now() - listenStartRef.current) / 1000);
    setPhase("reveal");
    phaseRef.current = "reveal";
    setEchoStep(null);
    setAiResult(null);
    const cur = stepsRef.current[idxRef.current];
    // 給辨識一點時間收尾,再讀最終文字
    const usedWebSpeech = webSpeechActiveRef.current;
    stopWebSpeech();
    const pat = cur.groupTitle ?? lessonRef.current.patternText;
    if (usedWebSpeech) {
      schedule(() => {
        const said = liveTranscriptRef.current.trim();
        setHeardText(said);
        if (aiRef.current && said) {
          // 背景模式:只收集,整輪結束後一次詳評
          repsRef.current.push({ i: idxRef.current, cue: cur.cue, expected: cur.answer, said, type: cur.type, pattern: pat, nativeZh: cur.nativeZh });
        } else if (localMatchRef.current && said) {
          // 純本地比對(AI 關):不即時顯示對錯,但答錯仍記入複習
          const r = localJudge(cur.answer, said);
          if (!r.correct) { logRep(cur, "wrong"); repWordMarkedRef.current = true; }
        }
        revealAndContinue(cur);
      }, 350);
      return;
    }
    const rec = recorderRef.current;
    if (aiRef.current && micRef.current && rec && rec.state !== "inactive") {
      // Whisper 路徑:背景轉寫後收集本發(不卡流程),整輪結束後一次評分
      const myChunks = chunksRef.current;
      const stepIdx = idxRef.current;
      rec.onstop = async () => {
        const blob = new Blob(myChunks, { type: rec.mimeType || "audio/webm" });
        const text = await transcribe(blob);
        if (text) repsRef.current.push({ i: stepIdx, cue: cur.cue, expected: cur.answer, said: text, type: cur.type, pattern: pat, nativeZh: cur.nativeZh });
      };
      try { rec.stop(); } catch {}
      revealAndContinue(cur);
    } else {
      revealAndContinue(cur);
    }
  }
  function revealAndContinue(cur: Step) {
    // 練過就讓單字升 box(由易到難推進);若已標不熟/答錯則不記。
    // AI 背景模式:不在此自動記「答對」,由整輪結束後的 AI 評分統一判定。
    if (!repWordMarkedRef.current && cur.cue && !aiRef.current) logWord(cur, "correct");
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
  // 寫入複習紀錄(答錯 / 標記不熟):句子 / 單字 可分開
  function logSentence(cur: Step, event: "wrong" | "unknown" | "correct") {
    if (event !== "correct") sessionErrorRef.current = true;
    const lid = lessonRef.current?.id ?? selectedId;
    logReview({ kind: "sentence", ref: `sent:${lid}:${cur.answer}`, text: cur.answer, nativeZh: cur.nativeZh, patternId: lid, event });
  }
  function logWord(cur: Step, event: "wrong" | "unknown" | "correct") {
    if (!cur.cue) return;
    if (event !== "correct") sessionErrorRef.current = true;
    const lid = lessonRef.current?.id ?? selectedId;
    logReview({ kind: "word", ref: `word:${cur.cue}`, text: cur.cue, nativeZh: "", patternId: lid, event });
  }
  // AI 判定整句錯 → 句子 + 單字都記
  function logRep(cur: Step, event: "wrong" | "unknown") { logSentence(cur, event); logWord(cur, event); }
  function flash(msg: string) { setMarkedMsg(msg); schedule(() => setMarkedMsg(""), 1500); }
  function markWordUnknown() { const cur = stepsRef.current[idxRef.current]; if (cur) { repWordMarkedRef.current = true; logWord(cur, "unknown"); flash("單詞已加入複習"); } }
  function markSentenceUnknown() { const cur = stepsRef.current[idxRef.current]; if (cur) { logSentence(cur, "unknown"); flash("句子已加入複習"); } }
  // AI 選詞過濾:把這個句框「還沒判過」的候選字交給 AI,壞的排除、好壞都記(之後不再重判)
  async function aiFilterFrame(f: { frame: string; category: string; pos?: string; slot?: string; conj?: string; frameZh: string } | undefined) {
    if (!aiFilterRef.current || !f) return;
    const cands = candidateWords(f as Parameters<typeof candidateWords>[0], 40);
    const unjudged = cands.filter((w) => !checkedCombosRef.current.has(`${f.frame}|${w}`));
    if (!unjudged.length) return;
    const bad = await checkFrame(frameDisplay(f as Parameters<typeof frameDisplay>[0]), unjudged);
    if (!bad) return; // 沒金鑰/失敗 → 不記、不過濾
    const badSet = new Set(bad);
    for (const w of unjudged) {
      const k = `${f.frame}|${w}`;
      checkedCombosRef.current.add(k);
      if (badSet.has(w)) badCombosRef.current.add(k);
    }
    await recordChecks(f.frame, unjudged.map((w) => ({ word: w, ok: !badSet.has(w) })));
  }

  function finish() {
    clearTimers();
    try { window.speechSynthesis?.cancel(); } catch {}
    stopWebSpeech();
    closeMic();
    const dur = (Date.now() - startRef.current) / 1000;
    setDurationSec(dur);
    // 寫入真實練習紀錄(供「我的」頁 + 打卡日曆)
    const meta = sessionMetaRef.current; // 本輪設定(同步記下,非舊閉包)
    const lid = meta.lessonId || selectedId;
    const ts = timesRef.current;
    const avg = ts.length ? ts.reduce((a, b) => a + b, 0) / ts.length : null;
    logSession({ duration_sec: dur, drill_type: meta.mode, lesson_id: lid, reps: stepsRef.current.length, avg_reaction: avg });
    // 句型模式:不寫 FSI 進度/間隔(只記練習時間)
    if (!patternModeRef.current) {
      // drill gap:整輪全對→box+1;有錯→歸零。AI 背景模式延後到分析完成再記。
      if (!aiRef.current) logDrill(lid, meta.mode, lessonRef.current.patternText, sessionErrorRef.current);
      const np = markSession(progressRef.current, lid, { mode: meta.mode, frame: meta.frame, person: meta.person, op: meta.op });
      setProgress(np);
      progressRef.current = np;
    }
    setMode("complete");
  }

  // 整輪結束後一次性 AI 評分:把收集到的每一發送一次,回傳每發對錯 + 弱點總結。
  // 寫入 SRS(對→升 box、錯→進複習) + error_log + 延後的 drill gap。
  async function runSessionReview() {
    if (batchDoneRef.current) return;
    batchDoneRef.current = true;
    const meta = sessionMetaRef.current;
    const reps = repsRef.current.slice();
    const lid = meta.lessonId || lessonRef.current?.id || selectedId;
    const pat = lessonRef.current?.patternText ?? "";
    if (!reps.length) { logDrill(lid, meta.mode, pat, sessionErrorRef.current); return; }

    setSessionAiLoading(true);
    setSessionAiMsg("");
    const review = await sessionReview({ pattern: pat, reps: reps.map((r) => ({ expected: r.expected, said: r.said, type: r.type })) });
    setSessionAiLoading(false);

    // 對映回每一發(以回傳 i 對位,對不上用本地比對兜底)。產生與 reps 對齊的對錯陣列。
    const byI = new Map<number, { correct: boolean; errors: string[] }>();
    if (review) for (const res of review.results) if (Number.isInteger(res.i) && res.i >= 0 && res.i < reps.length) byI.set(res.i, { correct: res.correct, errors: res.errors });

    let anyWrong = false;
    const allErrors: string[] = [];
    const outcomes = reps.map((rep, k) => {
      const v = byI.get(k) ?? { correct: localJudge(rep.expected, rep.said).correct, errors: [] };
      if (v.correct) {
        if (rep.cue) logReview({ kind: "word", ref: `word:${rep.cue}`, text: rep.cue, nativeZh: "", patternId: lid, event: "correct" });
      } else {
        anyWrong = true;
        if (rep.cue) logReview({ kind: "word", ref: `word:${rep.cue}`, text: rep.cue, nativeZh: "", patternId: lid, event: "wrong" });
        logReview({ kind: "sentence", ref: `sent:${lid}:${rep.expected}`, text: rep.expected, nativeZh: rep.nativeZh ?? "", patternId: lid, event: "wrong" });
        allErrors.push(...v.errors);
      }
      return v;
    });
    setSessionVerdicts(outcomes);
    sessionErrorRef.current = sessionErrorRef.current || anyWrong;
    if (allErrors.length) logErrors(allErrors, { lessonId: lid });
    // 延後到此才記 drill gap(整輪全對才升 box)
    logDrill(lid, meta.mode, pat, sessionErrorRef.current);
    if (review) setSessionAi(review);
    else setSessionAiMsg("AI 分析暫時無法使用,已用本地比對評分(對錯仍記錄)。");
  }

  function openLesson(id: string) {
    setSelectedId(id);
    setMode("select");
  }
  async function startSession(type: DrillType, opKey?: string, frameKey?: string, person?: PKey | "all") {
    unlockTTS(); // 在點擊手勢當下解鎖手機語音
    patternModeRef.current = null; // 一般 FSI 模式
    // AI 選詞過濾:把此句框沒判過的字交給 AI,壞的排除(判過不重判)
    const fr = framesOf(getLesson(selectedId));
    const f = type === "Substitution" ? fr.find((x) => x.frame === opKey) ?? fr[0] : transformFrames(getLesson(selectedId)).find((x) => x.frame === frameKey) ?? transformFrames(getLesson(selectedId))[0];
    await aiFilterFrame(f);
    // 刷新單字複習狀態(練過的會升 box → 換新字、由易到難推進)+ 帶入最新封鎖
    setSelectionContext(getActiveWordbook(), await getWordReviewMap(), badCombosRef.current);
    setSelectedOp(opKey);
    setSelectedFrame(frameKey);
    if (person) setSelectedPerson(person);
    // 同步記下本輪設定(供 finish 用,避免讀到舊閉包的 state)
    sessionMetaRef.current = {
      lessonId: selectedId,
      mode: type,
      frame: type === "Substitution" ? opKey : frameKey,
      op: type === "Transformation" ? opKey : undefined,
      person,
    };
    let s = buildSession(getLesson(selectedId), type, opKey, frameKey, person);
    // 依 drill gap 決定發數(首次/gap1=20、gap2=10、gap3=5、gap4+=3)
    const box = drillReviewRef.current.get(drillKey(selectedId, type))?.box ?? 0;
    s = s.slice(0, repCountForBox(box));
    sessionErrorRef.current = false;
    repsRef.current = [];
    batchDoneRef.current = false;
    setSessionAi(null);
    setSessionAiMsg("");
    setSessionAiLoading(false);
    setSessionVerdicts([]);
    stepsRef.current = s;
    timesRef.current = [];
    setSteps(s);
    setDrillType(type);
    setMode("running");
    setPaused(false);
    setEchoStep(null);
    startRef.current = Date.now();
    if (useMic && !wsMode) { // Web Speech 模式不開 VAD(自己用麥)
      const ok = await initMic();
      setMicError(!ok);
      micRef.current = ok;
    }
    runStep(0);
  }
  // 句型模式:練一個句型的例句(看公式/聽例句 → 跟讀說出 → 比對)。沿用 running 引擎。
  async function startPatternSession(p: SentencePattern) {
    unlockTTS();
    patternModeRef.current = p;
    const s: Step[] = p.examples.map((ex) => ({ type: "Substitution" as DrillType, cue: ex, answer: ex, nativeZh: p.zh ?? "", groupKey: p.id, groupTitle: p.pattern }));
    sessionMetaRef.current = { lessonId: `pattern:${p.id}`, mode: "Substitution" };
    sessionErrorRef.current = false;
    repsRef.current = [];
    batchDoneRef.current = false;
    setSessionAi(null); setSessionAiMsg(""); setSessionAiLoading(false); setSessionVerdicts([]);
    stepsRef.current = s;
    timesRef.current = [];
    setSteps(s);
    setDrillType("Substitution");
    setMode("running");
    setPaused(false);
    setEchoStep(null);
    startRef.current = Date.now();
    if (useMic && !wsMode) { const ok = await initMic(); setMicError(!ok); micRef.current = ok; }
    runStep(0);
  }
  function togglePause() {
    if (paused) { setPaused(false); runStep(idxRef.current); }
    else { setPaused(true); clearTimers(); try { window.speechSynthesis?.cancel(); } catch {} }
  }
  function stop() {
    clearTimers();
    try { window.speechSynthesis?.cancel(); } catch {}
    stopWebSpeech();
    closeMic();
    setMode(patternModeRef.current ? "home" : "select");
  }
  useEffect(() => () => { clearTimers(); closeMic(); }, []);
  useEffect(() => { initProgress().then(setProgress); }, []);
  // 開關狀態記憶(localStorage):載入一次,之後變動即存
  const settingsLoaded = useRef(false);
  useEffect(() => {
    const get = (k: string, def: boolean) => { try { const v = localStorage.getItem(k); return v === null ? def : v === "1"; } catch { return def; } };
    setUseMic(get("erc_mic", true));
    setAudioOn(get("erc_audio", true));
    setEchoLoop(get("erc_echo", false));
    setAiOn(get("erc_ai", false));
    setAiFilterOn(get("erc_aifilter", true));
    setLocalMatchOn(get("erc_localmatch", true));
    setWebSpeechOn(get("erc_webspeech", true));
    setShowTranslation(get("erc_translation", false));
    settingsLoaded.current = true;
  }, []);
  useEffect(() => {
    if (!settingsLoaded.current) return;
    try {
      const set = (k: string, v: boolean) => localStorage.setItem(k, v ? "1" : "0");
      set("erc_mic", useMic); set("erc_audio", audioOn); set("erc_echo", echoLoop);
      set("erc_ai", aiOn); set("erc_aifilter", aiFilterOn); set("erc_localmatch", localMatchOn);
      set("erc_webspeech", webSpeechOn); set("erc_translation", showTranslation);
    } catch {}
  }, [useMic, audioOn, echoLoop, aiOn, aiFilterOn, localMatchOn, webSpeechOn, showTranslation]);
  // 進入「完成」頁且本輪開了 AI → 自動對整輪做一次 AI 分析
  useEffect(() => {
    if (mode === "complete" && aiOn && !batchDoneRef.current) runSessionReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, aiOn]);
  useEffect(() => {
    initContent().then(async () => {
      // Phase 2 選詞情境:使用中詞本 + 單字複習狀態
      const wb = getActiveWordbook();
      const [review, drills, combos] = await Promise.all([getWordReviewMap(), getDrillReviewMap(), getComboChecks()]);
      badCombosRef.current = combos.bad;
      checkedCombosRef.current = combos.checked;
      setSelectionContext(wb, review, combos.bad);
      drillReviewRef.current = drills;
      setContentTick((t) => t + 1);
    });
  }, []);

  // ─────────── 設定面板(各開關 + 功能說明)───────────
  const SETTINGS: { icon: string; label: string; desc: string; value: boolean; set: (v: boolean) => void; warn?: string }[] = [
    { icon: "🎤", label: "麥克風偵測", value: useMic, set: setUseMic,
      desc: "用麥克風自動聽你開口、計算反應時間,說完自動判斷。關閉則改用手動按鈕「我開始說了/說完了」。" },
    { icon: "🎙", label: "即時辨識(免費)", value: webSpeechOn, set: setWebSpeechOn,
      desc: "用瀏覽器內建語音辨識,邊說邊把你說的字顯示出來。只有支援的瀏覽器有(如電腦版 Chrome)。", warn: webSpeechSupported ? undefined : "此瀏覽器不支援,會自動改用麥克風偵測。" },
    { icon: "🔊", label: "語音朗讀", value: audioOn, set: setAudioOn,
      desc: "自動唸出提示與正解。手機請先點一下畫面任何地方解鎖聲音,之後才能自動播。" },
    { icon: "🔁", label: "Echo 跟讀循環", value: echoLoop, set: setEchoLoop,
      desc: "正解之後加跑「英文 → 中文 → 英文」,中間留時間讓你跟著覆述一遍,加深肌肉記憶。" },
    { icon: "🌐", label: "顯示翻譯", value: showTranslation, set: setShowTranslation,
      desc: "出題時同時顯示中文。預設關閉,逼自己直接用英文反應(FSI 訓練建議關)。" },
    { icon: "✅", label: "本地比對(免費)", value: localMatchOn, set: setLocalMatchOn,
      desc: "不花錢,用程式即時比對你說的與正解,立刻顯示對/錯。縮寫視為相同(I'm = I am)。AI 評分關閉時用它判分。" },
    { icon: "🤖", label: "AI 評分", value: aiOn, set: setAiOn, warn: "需 OpenAI 金鑰,會產生費用。",
      desc: "練習時不卡頓(背景收集),整輪結束後一次送 AI:給每發對錯、錯誤類別(時態/單詞/介係詞…)與弱點總結,並寫入複習與「學習分析」。" },
    { icon: "🧹", label: "AI 選詞過濾", value: aiFilterOn, set: setAiFilterOn, warn: "需 OpenAI 金鑰,會產生費用。",
      desc: "開始前用 AI 自動排除文法不通的「單字 × 句框」組合(例如不該搭的詞),判斷過的就快取、之後不再重判。" },
  ];
  const settingsOverlay = showSettings ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={() => setShowSettings(false)}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-100">⚙ 設定</h2>
          <button onClick={() => setShowSettings(false)} className="ml-auto text-slate-500 hover:text-slate-200">✕</button>
        </div>
        <p className="mb-4 text-xs text-slate-500">這些設定會自動記住,下次開啟沿用。</p>
        <div className="space-y-2">
          {SETTINGS.map((s) => (
            <label key={s.label} className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-700 bg-ink-900/40 p-3 transition hover:border-accent/40">
              <span className="mt-0.5 text-xl">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{s.label}</span>
                  {s.warn && <span className="chip bg-gold/15 text-[10px] text-gold">{s.warn}</span>}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={s.value}
                onClick={() => s.set(!s.value)}
                className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${s.value ? "bg-accent" : "bg-ink-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${s.value ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  // ─────────── HOME ───────────
  if (mode === "home") {
    const orderedIds = learningPath.flatMap((c) => c.units.filter((u) => u.lessonId).map((u) => u.lessonId!));
    const nextNewId = recommendNextLessonId(progress, orderedIds);
    // 推薦:優先「到期複習」的 drill,否則新進度
    const dueDrills = Array.from(drillReviewRef.current.entries())
      .filter(([, v]) => v.next_review && new Date(v.next_review).getTime() <= Date.now())
      .sort((a, b) => (a[1].next_review ?? "").localeCompare(b[1].next_review ?? ""));
    const recId = dueDrills.length ? dueDrills[0][0].split(":")[1] : nextNewId;
    const todayId = orderedIds.includes(recId) ? recId : nextNewId;
    const recDue = dueDrills.length > 0;
    const masteredN = orderedIds.filter((id) => lessonProgress(progress, getLesson(id)).mastered).length;
    return (
      <Shell>
        <div className="mb-5">
          <p className="text-sm text-slate-500">特工 {learner.codename} · 第 {learner.cycle} 週期 · 估計 CLB {learner.estClb}</p>
          <h1 className="mt-1 text-2xl font-bold">準備好建立反射了嗎？</h1>
          <p className="mt-1 text-xs text-slate-500">已掌握 {masteredN} / 30 單元</p>
        </div>

        {/* 訓練分層:FSI模式 / 句型模式 */}
        <div className="mb-4 flex items-stretch gap-2">
          <button onClick={() => setTrainMode("fsi")} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${trainMode === "fsi" ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>FSI 模式<span className="block text-[10px] font-normal opacity-70">三階段 · 反射操練</span></button>
          <button onClick={() => setTrainMode("sentence")} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${trainMode === "sentence" ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>句型模式<span className="block text-[10px] font-normal opacity-70">基本 + 應用句型</span></button>
          <button onClick={() => setShowSettings(true)} className="btn-ghost px-3 text-sm" title="設定">⚙</button>
        </div>

        {trainMode === "sentence" ? (
          <>
            <div className="mb-3 flex gap-2">
              <button onClick={() => setSentenceTier("basic")} className={`chip ${sentenceTier === "basic" ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>基本句型 ({SP_BASIC.length})</button>
              <button onClick={() => setSentenceTier("applied")} className={`chip ${sentenceTier === "applied" ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>應用句型 ({SP_APPLIED.length})</button>
            </div>
            <p className="mb-2 text-xs text-slate-500">{sentenceTier === "basic" ? "五大基本句:看公式 → 跟讀例句。" : "110 常見句型:看公式 → 跟讀例句。"}</p>
            <ul className="space-y-2">
              {patternsByTier(sentenceTier).map((p) => (
                <li key={p.id}>
                  <button onClick={() => startPatternSession(p)} className="card flex w-full items-center gap-3 p-3.5 text-left transition hover:border-accent/50">
                    <span className="chip shrink-0 bg-accent/15 text-[10px] text-accent">{p.id}</span>
                    <div className="min-w-0 flex-1">
                      <code className="text-sm font-semibold text-slate-100">{p.pattern}</code>
                      {p.zh && <div className="text-[11px] text-slate-500">{p.zh}</div>}
                      <div className="truncate text-[11px] text-slate-600">{p.examples[0]}</div>
                    </div>
                    <span className="chip shrink-0 bg-ink-700 text-[10px] text-slate-300">{p.examples.length} 句</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
        <>
        <button onClick={() => openLesson(todayId)} className="block w-full overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-ink-900 p-6 text-left transition hover:border-accent/70">
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">{recDue ? "推薦 · Recommendation(複習到期)" : "推薦 · Recommendation"}</div>
          <div className="mt-1 text-2xl font-bold text-slate-100">{getLesson(todayId).patternText}</div>
          <div className="mt-2 text-xs text-slate-500">Unit {getLesson(todayId).unit} · {recDue ? "間隔複習到期,建議現在練" : "新進度"} → 點選操練</div>
          <span className="btn-primary mt-4">▶ {recDue ? "開始複習" : "繼續學習"}</span>
        </button>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">學習路徑 · FSI 30 單元</h2>
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
        </>
        )}
        {settingsOverlay}
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
            const mp = modeProgress(progress, lesson, m.type);
            const onClick = isSub ? () => setMode("selectSub") : isTrans ? () => setMode("selectTransFrame") : () => startSession(m.type);
            return (
              <button key={m.type} onClick={onClick} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${mp.mastered ? "bg-accent text-ink-950" : "bg-accent/15 text-accent"}`}>{mp.mastered ? "✓" : i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-100">{drillTypeZh[m.type]} <span className="text-xs font-normal text-slate-600">{m.type}</span></div>
                  <div className="text-xs text-slate-500">{m.desc}</div>
                </div>
                <span className={`chip shrink-0 ${mp.mastered ? "bg-accent/15 text-accent" : "bg-ink-700 text-slate-300"}`}>句框 {mp.done}/{mp.total} 掌握{hasSecond ? " ›" : ""}</span>
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
          {framesOf(lesson).map((f, i) => {
            const fp = frameProgress(progress, lesson, "Substitution", f.frame);
            return (
            <button key={`${f.frame}-${i}`} onClick={() => { setSelectedFrame(f.frame); if (f.conj && !f.subj) setMode("selectSubPerson"); else startSession("Substitution", f.frame); }} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${fp.mastered ? "bg-accent text-ink-950" : "bg-accent/15 text-accent"}`}>{fp.mastered ? "✓" : i + 1}</span>
              <div className="min-w-0 flex-1">
                <code className="text-base font-semibold text-slate-100">{frameDisplay(f)}</code>
              </div>
              <span className={`chip shrink-0 ${fp.mastered ? "bg-accent/15 text-accent" : "bg-ink-700 text-slate-300"}`}>{f.conj ? `人稱 ${fp.done}/${fp.total}` : (fp.mastered ? "已掌握" : "未練")}</span>
            </button>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ─────────── SELECT 替換人稱（替換第三層）───────────
  if (mode === "selectSubPerson") {
    const fObj = framesOf(lesson).find((f) => f.frame === selectedFrame);
    return (
      <Shell>
        <button onClick={() => setMode("selectSub")} className="mb-4 text-sm text-slate-500 hover:text-slate-300">← 返回</button>
        <div className="mb-5">
          <div className="text-xs text-slate-500">替換 · <code className="text-slate-300">{fObj ? frameDisplay(fObj) : ""}</code></div>
          <h1 className="text-xl font-bold text-slate-100">選人稱(主詞)</h1>
        </div>
        <div className="space-y-3">
          <button onClick={() => startSession("Substitution", selectedFrame, undefined, "all")} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-accent">全部輪流</div>
              <div className="text-xs text-slate-500">20 發輪流 I / You / He / She / We / They</div>
            </div>
          </button>
          <div className="grid grid-cols-3 gap-3">
            {PERSON_ORDER.map((p) => {
              const done = isSubDone(progress, lesson.id, selectedFrame ?? "", p);
              return (
                <button key={p} onClick={() => startSession("Substitution", selectedFrame, undefined, p)} className={`card p-4 text-center font-semibold transition hover:border-accent/50 ${done ? "border-accent/40 text-accent" : "text-slate-100"}`}>{done ? "✓ " : ""}{p}</button>
              );
            })}
          </div>
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
          {transformFrames(lesson).map((f, i) => {
            const fp = frameProgress(progress, lesson, "Transformation", f.frame);
            return (
            <button key={`${f.frame}-${i}`} onClick={() => { setSelectedFrame(f.frame); setMode("selectOp"); }} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${fp.mastered ? "bg-accent text-ink-950" : "bg-accent/15 text-accent"}`}>{fp.mastered ? "✓" : i + 1}</span>
              <div className="min-w-0 flex-1">
                <code className="text-base font-semibold text-slate-100">{frameDisplay(f)}</code>
              </div>
              <span className={`chip shrink-0 ${fp.mastered ? "bg-accent/15 text-accent" : "bg-ink-700 text-slate-300"}`}>人稱×操作 {fp.done}/{fp.total}</span>
            </button>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ─────────── SELECT 人稱 + 轉換操作（第二層之二）───────────
  if (mode === "selectOp") {
    const fr = transformFrames(lesson);
    const fObj = fr.find((f) => f.frame === selectedFrame) ?? fr[0];
    return (
      <Shell>
        <button onClick={() => setMode("selectTransFrame")} className="mb-4 text-sm text-slate-500 hover:text-slate-300">← 返回</button>
        <div className="mb-5">
          <div className="text-xs text-slate-500">轉換 · <code className="text-slate-300">{fObj ? frameDisplay(fObj) : ""}</code></div>
          <h1 className="text-xl font-bold text-slate-100">選人稱 + 變換操作</h1>
        </div>
        {/* 人稱(固定主詞的句框不需選) */}
        {!fObj?.subj && (
          <div className="mb-4">
            <div className="mb-2 text-xs text-slate-500">人稱(主詞)</div>
            <div className="flex flex-wrap gap-2">
              {PERSON_ORDER.map((p) => {
                const pdone = TRANSFORM_OPS.every((op) => isTransDone(progress, lesson.id, selectedFrame ?? "", p, op));
                return (
                  <button key={p} onClick={() => setSelectedPerson(p)} className={`chip ${selectedPerson === p ? "bg-accent text-ink-950" : pdone ? "bg-ink-800 text-accent" : "bg-ink-800 text-slate-300"}`}>{pdone ? "✓ " : ""}{p}</button>
                );
              })}
            </div>
          </div>
        )}
        {/* 操作 */}
        <div className="space-y-3">
          {TRANSFORM_OPS.map((op) => {
            const ex = transformExample(lesson, op, selectedFrame, selectedPerson);
            const person = fObj?.subj ?? selectedPerson;
            const done = isTransDone(progress, lesson.id, selectedFrame ?? "", person, op);
            return (
              <button key={op} onClick={() => startSession("Transformation", op, selectedFrame, selectedPerson)} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/50">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-accent text-ink-950" : "bg-accent/15 text-accent"}`}>{done ? "✓" : "→"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-100">{opLabel[op]}</div>
                  <div className="text-xs text-slate-500">例：{ex.answer}</div>
                </div>
                <span className="chip shrink-0 bg-ink-700 text-slate-300">{done ? `✓ ${person}` : person}</span>
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
          <h2 className="mt-3 text-2xl font-bold">{patternModeRef.current ? "句型練習" : drillTypeZh[drillType]}完成！</h2>
          <p className="mt-1 text-sm text-slate-400">{patternModeRef.current ? patternModeRef.current.pattern : lesson.patternText}</p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3"><div className="text-2xl font-black text-slate-100">{stepsRef.current.length}</div><div className="text-xs text-slate-500">完成發數</div></div>
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3"><div className="text-2xl font-black text-accent">{avg ? avg.toFixed(1) : "—"}s</div><div className="text-xs text-slate-500">平均反應</div></div>
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3"><div className="text-2xl font-black text-accent">{fastest ? fastest.toFixed(1) : "—"}s</div><div className="text-xs text-slate-500">最快</div></div>
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3"><div className="text-2xl font-black text-slate-100">{mm}:{ss}</div><div className="text-xs text-slate-500">用時</div></div>
          </div>
          {/* 整輪 AI 分析(背景模式:練完才評) */}
          {aiOn && (
            <div className="mx-auto mt-6 max-w-md text-left">
              {sessionAiLoading ? (
                <div className="card p-4 text-center text-sm text-slate-400 animate-pulse">🤖 正在對這 {repsRef.current.length} 發做整體分析…</div>
              ) : sessionAi ? (
                <div className="card p-4">
                  {(() => { const reps = repsRef.current; const ok = sessionVerdicts.filter((v) => v.correct).length;
                    return (
                      <>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">🤖 整輪分析</span>
                          <span className="chip ml-auto bg-accent/15 text-[11px] text-accent">答對 {ok}/{reps.length}</span>
                        </div>
                        <p className="text-sm text-slate-200">{sessionAi.summary}</p>
                        {sessionAi.tips.length > 0 && (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{sessionAi.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                        )}
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-slate-500">逐發明細</summary>
                          <ul className="mt-2 space-y-1.5">
                            {reps.map((rep, k) => { const v = sessionVerdicts[k]; const correct = v ? v.correct : true; return (
                              <li key={k} className="rounded-lg border border-ink-700 bg-ink-900/40 px-2.5 py-1.5 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={correct ? "text-accent" : "text-red-400"}>{correct ? "✓" : "✗"}</span>
                                  <span className="min-w-0 flex-1 truncate text-slate-200">{rep.expected}</span>
                                </div>
                                {!correct && <div className="mt-0.5 pl-5 text-xs text-slate-500">你說:「{rep.said}」{v?.errors?.length ? ` · ${v.errors.join("、")}` : ""}</div>}
                              </li>
                            ); })}
                          </ul>
                        </details>
                      </>
                    ); })()}
                </div>
              ) : sessionAiMsg ? (
                <div className="card p-4 text-sm text-gold">{sessionAiMsg}</div>
              ) : null}
            </div>
          )}

          <div className="mx-auto mt-6 flex max-w-sm gap-2">
            {patternModeRef.current ? (
              <>
                <button onClick={() => startPatternSession(patternModeRef.current!)} className="btn-ghost flex-1">再練一次</button>
                <button onClick={() => setMode("home")} className="btn-primary flex-1">回句型列表</button>
              </>
            ) : (
              <>
                <button onClick={() => startSession(drillType, selectedOp, selectedFrame, selectedPerson)} className="btn-ghost flex-1">再練一次</button>
                <button onClick={() => setMode("select")} className="btn-primary flex-1">換個模式</button>
              </>
            )}
          </div>
        </div>
        {settingsOverlay}
      </Shell>
    );
  }

  // ─────────── RUNNING ───────────
  const topPattern = step?.groupTitle ?? lesson.patternText;
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
            {showTranslation && step?.nativeZh && <div className="text-base text-slate-400">{step.nativeZh}</div>}
            <div className="text-sm text-slate-500">🔊 播放提示中…</div>
          </>
        ) : phase === "listening" ? (
          <>
            <div className="text-xs uppercase tracking-widest text-slate-600">{step?.type === "Response" ? "直覺回答" : "現在開口！"}</div>
            <div className="text-3xl font-bold text-gold">{step?.cue}</div>
            {showTranslation && step?.nativeZh && <div className="text-base text-slate-400">{step.nativeZh}</div>}
            <div className={`text-4xl font-black tabular-nums ${liveTimer > 3 ? "text-red-400" : liveTimer > 1.5 ? "text-gold" : "text-accent"}`}>{liveTimer.toFixed(1)}s</div>
            <div className="text-xs text-slate-500">⏱ 反應速度計時中（3 秒內開口為佳，不會打斷你）</div>
            {wsMode && <div className="min-h-[1.25rem] text-sm text-accent">{heardText ? `辨識:${heardText}` : "🎙 即時辨識中…"}</div>}
            {wsMode ? (
              <div className="flex items-center gap-2 text-sm text-accent"><span className="text-lg">🎙</span> 偵測中…說完會自動判斷</div>
            ) : micRef.current ? (
              <div className="flex items-center gap-2 text-sm text-accent"><span className="text-lg">🎙</span> 偵測中…大聲說出完整句子</div>
            ) : (
              <button onClick={manualStart} className="btn-primary px-8 py-3">我開始說了</button>
            )}
            {wsMode && <button onClick={endSpeaking} className="btn-ghost px-6 py-2 text-sm">說完了 →</button>}
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
            {wsMode && heardText && <div className="text-sm text-accent">辨識:{heardText}</div>}
            {(!micRef.current || wsMode) && <button onClick={endSpeaking} className="btn-primary px-8 py-3">說完了 →</button>}
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
            {showTranslation && step?.nativeZh && <div className="text-sm text-slate-500">{step.nativeZh}</div>}
            <div className="text-sm text-slate-400">你的反應：<span className={tierColor[tier(reaction)]}>{reaction.toFixed(1)}s · {tier(reaction)}</span></div>
            {!aiResult && heardText && <div className="mt-1 text-sm text-accent">你說的(即時辨識):「{heardText}」</div>}
            {aiRef.current && <div className="mt-1 text-xs text-slate-500">🤖 背景評分中,整輪結束後一次詳評</div>}
            {aiResult && (
              <div className="mt-2 w-full max-w-md rounded-xl border border-ink-700 bg-ink-900/40 p-3 text-left text-sm">
                <div className="mb-1 text-xs text-slate-500">你說的：<span className="text-slate-300">“{aiResult.transcript || "(聽不清)"}”</span></div>
                <div className="flex items-center gap-2">
                  <span className={aiResult.correct ? "chip bg-accent/15 text-accent" : "chip bg-red-500/15 text-red-400"}>{aiResult.correct ? "✓ 正確" : "✗ 再修正"}</span>
                  <span className="text-xs text-slate-500">準確 {aiResult.accuracy} · 文法 {aiResult.grammar} · 流暢 {aiResult.fluency}</span>
                </div>
                <div className="mt-1.5 text-slate-200">{aiResult.feedback}</div>
                {aiResult.errors?.length > 0 && <div className="mt-1 text-xs text-gold">錯誤類別:{aiResult.errors.join("、")}</div>}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button onClick={togglePause} className="btn-ghost">{paused ? "▶ 繼續" : "⏸ 暫停"}</button>
        <button onClick={markWordUnknown} className="btn-ghost text-red-400">✗ 單詞不熟</button>
        <button onClick={markSentenceUnknown} className="btn-ghost text-red-400">✗ 句子不熟</button>
        <button onClick={() => setShowSettings(true)} className="btn-ghost">⚙ 設定</button>
      </div>
      {markedMsg && <p className="mt-2 text-center text-xs text-accent">{markedMsg}</p>}
      {micError && <p className="mt-3 text-center text-xs text-gold">麥克風無法使用，已切換為手動模式。</p>}
      <p className="mt-3 text-center text-xs text-slate-600">3 秒只是反應速度參考線，不是答案倒數。你開口後，說完才會出正解。</p>
      {settingsOverlay}
    </Shell>
  );
}
