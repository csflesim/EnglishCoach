export const runtime = "nodejs";

// 整輪(一輪 ~20 發)一次性評分 + 總結。背景模式:練習時不等 AI,結束後對整輪做一次分析。
// 回傳每發對錯/錯誤類別 + 整體弱點總結,省 token(一次呼叫取代每發一次)。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const { pattern, reps } = await req.json();
    const list = (Array.isArray(reps) ? reps : []) as { expected: string; said: string; type?: string }[];
    if (!list.length) return Response.json({ error: "no_reps" });

    const sys =
      "You are a CIA/FSI English pattern-drill coach. In FSI drills the goal is correct PATTERN MANIPULATION (structure, verb form, person, word order) — NOT idiomatic real-world naturalness. A grammatically-valid response that matches the expected drill pattern is CORRECT even if it sounds unusual in real life (e.g. 'Am I good?' is a valid be-question and is CORRECT). Contractions and full forms are EQUIVALENT (I am = I'm, do not = don't, cannot = can't). Ignore punctuation/casing (speech-to-text). The learner is a near-beginner Chinese speaker training reflex speed. Respond ONLY with JSON.";

    const repsText = list
      .map((r, i) => `#${i} expected="${r.expected}" said="${r.said || "(無)"}"`)
      .join("\n");

    const user =
      `Drill context (pattern): ${pattern ?? ""}\n` +
      `Below are this round's reps. For EACH, judge whether "said" matches "expected" by FSI pattern rules (same words & structure; contractions = full forms; ignore punctuation/casing/filler).\n\n` +
      `${repsText}\n\n` +
      `For each wrong rep, list EVERY error category that applies from this fixed list: 單詞, 文法, 時態, 冠詞, 介係詞, 字序, 單複數, 發音, 用詞.\n` +
      `Then write an overall coach summary (Traditional Chinese) for muscle-memory training: which pattern/error type to drill more, what improved. Give 2-4 concrete next-step tips (Traditional Chinese).\n` +
      `Return JSON exactly: {"results": [{"i": <index>, "correct": boolean, "errors": ["<category>", ...]}], "summary": "<繁中總結>", "tips": ["<繁中建議>", ...]}. correct reps have errors=[].`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) return Response.json({ error: "review_failed", detail: await r.text() });
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      return Response.json({ error: "parse_failed" });
    }
    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: "review_exception", detail: String(e) });
  }
}
