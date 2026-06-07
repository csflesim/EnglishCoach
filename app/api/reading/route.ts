export const runtime = "nodejs";

// 閱讀短文 + 題目產生器(gpt-4o-mini)。雅思風格:True/False/Not Given + 選擇題 + 生字。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const { level = "medium", topic = "" } = await req.json();
    const lvlDesc: Record<string, string> = {
      easy: "CEFR A2-B1, simple vocabulary, ~180-220 words",
      medium: "CEFR B1-B2, ~250-300 words",
      ielts: "IELTS Academic style, B2-C1, ~300-340 words, somewhat formal",
    };
    const desc = lvlDesc[level] ?? lvlDesc.medium;
    const topicLine = topic ? `Topic: ${topic}.` : "Pick an interesting general/academic topic (science, environment, history, technology, health, society).";

    const sys =
      "You are an IELTS reading test writer. Write ONE original informational passage and IELTS-style questions for a learner. Use paraphrase between passage and questions (key IELTS skill). Respond ONLY with JSON.";
    const user =
      `Write a reading passage at ${desc}. ${topicLine}\n` +
      `Then write 6 questions: 3 of type "tfng" (True / False / Not Given statements) and 3 of type "mcq" (4 options, one correct). Make some answers require paraphrase recognition; include at least one "Not Given".\n` +
      `Also list 6 useful vocabulary words from the passage with a Traditional-Chinese gloss.\n` +
      `Return JSON exactly: {"title":"...","passage":"...(plain text, may include \\n)","questions":[{"type":"tfng","prompt":"<statement>","answer":"True|False|Not Given","explanation":"<繁中:為什麼>"},{"type":"mcq","prompt":"<question>","options":["a","b","c","d"],"answer":0,"explanation":"<繁中>"}],"vocab":[{"word":"...","zh":"..."}]}`;

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
    try { return Response.json(JSON.parse(content)); } catch { return Response.json({ error: "parse_failed" }); }
  } catch (e) {
    return Response.json({ error: "gen_exception", detail: String(e) });
  }
}
