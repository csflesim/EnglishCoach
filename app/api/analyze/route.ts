export const runtime = "nodejs";

// 學習分析 (gpt-4o-mini)。吃弱點摘要,回繁中分析 + 建議。手動觸發,無金鑰則回 no_key。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const data = await req.json();
    const sys =
      "You are an encouraging FSI English coach for a Chinese-speaking near-beginner (goals: Canada immigration, CELPIP CLB6). Analyze the learner's weakness data and give a short, concrete plan. Respond ONLY with JSON.";
    const user =
      `Learner weakness data (JSON):\n${JSON.stringify(data)}\n\n` +
      `Return JSON exactly: {"summary": "<2-3 sentences in Traditional Chinese summarizing the learner's current weak spots>", "tips": ["<short actionable tip in Traditional Chinese>", "...up to 4 tips"]}`;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) return Response.json({ error: "analyze_failed", detail: await r.text() });
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    try {
      return Response.json(JSON.parse(content));
    } catch {
      return Response.json({ error: "parse_failed" });
    }
  } catch (e) {
    return Response.json({ error: "analyze_exception", detail: String(e) });
  }
}
