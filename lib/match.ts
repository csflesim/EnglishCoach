// 本地比對(免費,不呼叫 AI)。縮寫與完整形視為等價(I am = I'm),標點/大小寫忽略。

const CONTRACTIONS: Record<string, string> = {
  "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is", "it's": "it is",
  "we're": "we are", "they're": "they are", "that's": "that is", "what's": "what is", "who's": "who is",
  "there's": "there is", "here's": "here is", "let's": "let us",
  "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not", "aren't": "are not",
  "wasn't": "was not", "weren't": "were not", "won't": "will not", "wouldn't": "would not",
  "can't": "cannot", "couldn't": "could not", "shouldn't": "should not", "mustn't": "must not",
  "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
  "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will", "we'll": "we will", "they'll": "they will",
  "i'd": "i would", "you'd": "you would", "he'd": "he would", "she'd": "she would", "we'd": "we would", "they'd": "they would",
};

export function normalizeEn(s: string): string {
  let t = (s || "").toLowerCase().replace(/[’']/g, "'").trim();
  t = t.replace(/[.,!?;:"“”]/g, "");
  for (const [k, v] of Object.entries(CONTRACTIONS)) t = t.replace(new RegExp(`\\b${k}\\b`, "g"), v);
  t = t.replace(/\bcan not\b/g, "cannot").replace(/\bgonna\b/g, "going to").replace(/\bwanna\b/g, "want to");
  return t.replace(/\s+/g, " ").trim();
}

// 回傳 {correct, accuracy}。完全一致 → 100;否則用詞彙重疊比例,≥85% 視為正確(容許辨識小誤差)
export function localJudge(expected: string, said: string): { correct: boolean; accuracy: number } {
  const ne = normalizeEn(expected);
  const ns = normalizeEn(said);
  if (!ns) return { correct: false, accuracy: 0 };
  if (ne === ns) return { correct: true, accuracy: 100 };
  const a = ne.split(" ").filter(Boolean);
  const b = new Set(ns.split(" ").filter(Boolean));
  const hit = a.filter((w) => b.has(w)).length;
  const acc = Math.round((hit / Math.max(a.length, 1)) * 100);
  return { correct: acc >= 85, accuracy: acc };
}
