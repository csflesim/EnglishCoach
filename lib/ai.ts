// 前端呼叫自家 API 路由（金鑰在伺服器端）。失敗一律回 null → 前端優雅退回免費模式。

export type EvalResult = {
  correct: boolean;
  accuracy: number;
  grammar: number;
  fluency: number;
  feedback: string;
  weakness: string;
};

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
    return j as EvalResult;
  } catch {
    return null;
  }
}
