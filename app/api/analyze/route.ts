export const runtime = "nodejs";

// 學習分析 (gpt-4o-mini)。深入分析「實際錯在哪」:歸納錯誤類型、舉實例(你說的 vs 正解)、給針對性修正。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const data = await req.json();
    const sys =
      "You are an FSI English error analyst for a Chinese-speaking near-beginner (goals: Canada immigration, CELPIP CLB6). " +
      "You are given the learner's REAL logged mistakes: error category counts, and concrete samples with `expected` (the target answer) vs `said` (what the learner actually produced). " +
      "Your job is NOT to give generic motivation. DIAGNOSE precisely WHAT goes wrong and WHY, grouped by error type, citing concrete examples from the data. " +
      "Infer the underlying rule the learner is breaking (e.g. '過去式動詞沒變化', '第三人稱單數漏 s', 'a/an 用錯', '介係詞 in/on/at 混用'). Respond ONLY with JSON, all Chinese in Traditional Chinese.";
    const user =
      `Learner data (JSON):\n${JSON.stringify(data)}\n\n` +
      `For EACH error category that actually appears in the data, output an object: ` +
      `{"category":"<類別,如 時態/冠詞/介係詞/單複數/字序/單詞/用詞/發音>", "count": <該類出現次數,用 errorCounts 對應或估計>, ` +
      `"diagnosis":"<具體說明這位學習者在這類最常犯的錯、規則是什麼(繁中,1-2句)>", ` +
      `"examples":[{"wrong":"<你說的>","correct":"<正解>"}](最多3個,從 samples 取真實例子;沒有對應例子就給代表性例子), ` +
      `"fix":"<針對性的修正法/練法(繁中,1句)>"}. ` +
      `Sort categories by count desc. Then an overall summary. ` +
      `Return JSON exactly: {"summary":"<2-3句繁中總結最該優先解決的問題>", "categories":[ ... ], "tips":["<繁中,最多3條下一步>"]}`;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
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
