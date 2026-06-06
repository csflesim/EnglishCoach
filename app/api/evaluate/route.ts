export const runtime = "nodejs";

// 回應評分 (gpt-4o-mini)。比對學習者口說與目標句，回傳結構化 JSON。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const { pattern, expected, transcript, drillType } = await req.json();
    const sys =
      "You are a CIA/FSI English pattern-drill coach. In FSI drills the goal is correct PATTERN MANIPULATION (structure, verb form, person, word order) — NOT idiomatic real-world naturalness. A grammatically-valid response that matches the expected drill pattern is CORRECT even if the sentence sounds unusual or unlikely in real life (e.g. 'Am I good?' is a valid be-question and should be CORRECT). Ignore punctuation/casing (speech-to-text). Mark incorrect ONLY if the structure / verb form / word actually differs from the expected pattern. Be encouraging. Respond ONLY with JSON.";
    const user =
      `Drill type: ${drillType}\n` +
      `Pattern (context only): ${pattern}\n` +
      `Expected answer (THE target): ${expected}\n` +
      `Learner said: ${transcript}\n\n` +
      `Judge ONLY whether "Learner said" matches the "Expected answer" — same words & structure (ignore punctuation/casing/filler). correct=true if it matches the Expected answer, even if the sentence is unusual in real life. Do NOT penalize for differing from the generic Pattern.\n` +
      `If incorrect, identify EVERY error category that applies (from this fixed list): 單詞(wrong/missing vocabulary word), 文法(grammar), 時態(tense), 冠詞(a/an/the), 介係詞(preposition), 字序(word order), 單複數(singular/plural), 發音(a likely mispronunciation inferred from the transcript), 用詞(word choice). The feedback MUST be specific: say WHAT is wrong and the correction (e.g. "時態錯:應改用過去式 worked").\n` +
      `Return JSON exactly: {"correct": boolean, "accuracy": 0-100, "grammar": 0-100, "fluency": 0-100, "feedback": "<specific Traditional Chinese: what's wrong + how to fix>", "errors": ["<category from the list>", ...] }. If correct, errors=[].`;

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
    if (!r.ok) return Response.json({ error: "eval_failed", detail: await r.text() });
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
    return Response.json({ error: "eval_exception", detail: String(e) });
  }
}
