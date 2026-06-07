export const runtime = "nodejs";

// 句框清理 (gpt-4o-mini)。給一個句框 + 候選單字,回傳「填進去不通/不自然」的單字。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const { frame, words } = await req.json();
    if (!frame || !Array.isArray(words) || !words.length) return Response.json({ bad: [] });
    const sys =
      "You are an experienced English teacher building vocabulary substitution drills for a beginner. You will get a drill frame containing ___ and candidate words. Your job is to keep ONLY words that produce a NATURAL, idiomatic sentence that a fluent speaker would actually say, so the learner practices correct usage. " +
      "Flag (return as 'bad') any word that, when inserted, makes the sentence: (a) grammatically wrong, (b) semantically odd or nonsensical, (c) an unnatural/uncommon collocation, or (d) the wrong semantic type for the slot (e.g. an adjective that can't describe a person in 'I am ___', or an uncountable noun after 'a'). " +
      "Keep common, everyday, learner-appropriate combinations. Judge by natural usage, not by whether it is theoretically possible. Respond ONLY with JSON.";
    const user =
      `Frame: ${frame}\nCandidate words: ${JSON.stringify(words)}\n\n` +
      `Return JSON exactly: {"bad": ["<word that is unnatural/odd/ungrammatical in this frame>", ...]}. Keep only the words that sound natural.`;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) return Response.json({ error: "check_failed", detail: await r.text() });
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      return Response.json({ bad: Array.isArray(parsed.bad) ? parsed.bad : [] });
    } catch {
      return Response.json({ error: "parse_failed" });
    }
  } catch (e) {
    return Response.json({ error: "check_exception", detail: String(e) });
  }
}
