export const runtime = "nodejs";

// 多益閱讀 Part 5(單句填空)題目產生器(gpt-4o-mini)。可針對弱點文法出題。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const { count = 6, focus = [], level = "TOEIC 300-550" } = await req.json();
    const n = Math.min(Math.max(Number(count) || 6, 1), 10);
    const focusText = Array.isArray(focus) && focus.length ? `Bias the test points toward these weak areas when natural: ${focus.join(", ")}.` : "";

    const sys =
      "You are a professional TOEIC test writer. Write authentic TOEIC Part 5 (Incomplete Sentences) items: one business/office-context sentence with exactly one blank written as '____', four answer options, exactly ONE correct. Test real Part 5 points: verb tense, subject-verb agreement, part of speech / word form, prepositions, conjunctions, pronouns, relative clauses, comparatives, articles, or vocabulary. Distractors must be plausible. Keep vocabulary at the stated level. Respond ONLY with JSON.";
    const user =
      `Generate ${n} TOEIC Part 5 questions for a learner at ${level}. ${focusText}\n` +
      `Each item: a single sentence containing one '____'. Provide 4 options. answer = index (0-3) of the correct option. skill = one short Traditional-Chinese tag from: 時態, 主謂一致, 詞性, 介係詞, 連接詞, 代名詞, 關係子句, 比較, 冠詞, 單複數, 用詞. explanation = concise Traditional Chinese (why correct + key clue).\n` +
      `Return JSON exactly: {"questions":[{"sentence":"...____...","options":["a","b","c","d"],"answer":0,"skill":"時態","explanation":"..."}]}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) return Response.json({ error: "gen_failed", detail: await r.text() });
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(content); } catch { return Response.json({ error: "parse_failed" }); }
    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: "gen_exception", detail: String(e) });
  }
}
