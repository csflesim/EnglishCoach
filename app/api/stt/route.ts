export const runtime = "nodejs";

// 語音轉文字 (Whisper)。金鑰只在伺服器端使用。
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "no_key" });
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob)) return Response.json({ error: "no_audio" });

    const oai = new FormData();
    oai.append("file", audio, "audio.webm");
    oai.append("model", "whisper-1");
    oai.append("language", "en");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: oai,
    });
    if (!r.ok) return Response.json({ error: "stt_failed", detail: await r.text() });
    const j = await r.json();
    return Response.json({ text: (j.text ?? "").trim() });
  } catch (e) {
    return Response.json({ error: "stt_exception", detail: String(e) });
  }
}
