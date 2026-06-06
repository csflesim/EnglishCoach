export const runtime = "nodejs";

// 句框清理 (gpt-4o-mini)。給一個句框 + 候選單字,回傳「填進去不通/不自然」的單字。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const { frame, words } = await req.json();
    if (!frame || !Array.isArray(words) || !words.length) return Response.json({ bad: [] });
    const sys =
      "You check English sentence frames. Given a frame with ___ as the blank and candidate words, return the words that make a GRAMMATICALLY WRONG or clearly UNNATURAL/IMPOSSIBLE sentence when inserted. Be conservative: only flag clearly bad ones; if a word is acceptable (even if slightly odd), do NOT flag it. Respond ONLY with JSON.";
    const user =
      `Frame: ${frame}\nCandidate words: ${JSON.stringify(words)}\n\n` +
      `Return JSON exactly: {"bad": ["<word that does NOT work in this frame>", ...]}`;
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
