// 前端呼叫自家 API 路由（金鑰在伺服器端）。失敗一律回 null → 前端優雅退回免費模式。

export type EvalResult = {
  correct: boolean;
  accuracy: number;
  grammar: number;
  fluency: number;
  feedback: string;
  errors: string[]; // 錯誤類別:單詞/文法/時態/冠詞/介係詞/字序/單複數/發音/用詞
};

export async function checkFrame(frame: string, words: string[]): Promise<string[] | null> {
  try {
    const r = await fetch("/api/check-frame", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frame, words }) });
    const j = await r.json();
    if (j.error || !Array.isArray(j.bad)) return null;
    return j.bad as string[];
  } catch {
    return null;
  }
}

export type SessionRepResult = { i: number; correct: boolean; errors: string[] };
export type SessionReview = { results: SessionRepResult[]; summary: string; tips: string[] };
// 整輪一次性評分(背景模式:練完才送一次)。回傳每發對錯 + 整體弱點總結。
export async function sessionReview(p: {
  pattern: string;
  reps: { expected: string; said: string; type?: string }[];
}): Promise<SessionReview | null> {
  try {
    const r = await fetch("/api/session-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    const j = await r.json();
    if (j.error || !Array.isArray(j.results)) return null;
    return {
      results: (j.results as SessionRepResult[]).map((x) => ({ i: Number(x.i), correct: !!x.correct, errors: Array.isArray(x.errors) ? x.errors : [] })),
      summary: typeof j.summary === "string" ? j.summary : "",
      tips: Array.isArray(j.tips) ? j.tips : [],
    };
  } catch {
    return null;
  }
}

export type ToeicQuestion = { sentence: string; options: string[]; answer: number; skill: string; explanation: string };
// 多益閱讀 Part 5 出題(可帶弱點 focus)。失敗回 null → 前端用內建題庫。
export async function genToeic(opts: { count?: number; focus?: string[]; level?: string }): Promise<ToeicQuestion[] | null> {
  try {
    const r = await fetch("/api/toeic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(opts) });
    const j = await r.json();
    if (j.error || !Array.isArray(j.questions)) return null;
    return (j.questions as ToeicQuestion[])
      .filter((q) => q && typeof q.sentence === "string" && Array.isArray(q.options) && q.options.length === 4 && typeof q.answer === "number")
      .map((q) => ({ sentence: q.sentence, options: q.options, answer: Math.max(0, Math.min(3, q.answer)), skill: q.skill || "文法", explanation: q.explanation || "" }));
  } catch {
    return null;
  }
}

export type LearnAnalysis = { summary: string; tips: string[] };
export async function analyzeLearning(data: unknown): Promise<LearnAnalysis | null> {
  try {
    const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const j = await r.json();
    if (j.error || typeof j.summary !== "string") return null;
    return { summary: j.summary, tips: Array.isArray(j.tips) ? j.tips : [] };
  } catch {
    return null;
  }
}

export async function transcribe(blob: Blob): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("audio", blob, "audio.webm");
    const r = await fetch("/api/stt", { method: "POST", body: fd });
    const j = await r.json();
    if (j.error || typeof j.text !== "string") return null;
    return j.text;
  } catch {
    return null;
  }
}

export async function evaluate(p: {
  pattern: string;
  expected: string;
  transcript: string;
  drillType: string;
}): Promise<EvalResult | null> {
  try {
    const r = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const j = await r.json();
    if (j.error || typeof j.correct === "undefined") return null;
    return { ...j, errors: Array.isArray(j.errors) ? j.errors : [] } as EvalResult;
  } catch {
    return null;
  }
}
