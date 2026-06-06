"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { getReviewItems, logReview, isDue, type ReviewItem, type ReviewKind } from "@/lib/review";
import { initContent } from "@/lib/content";
import { wordFlashcard } from "@/lib/mock";
import { hasSupabase } from "@/lib/supabase";

const statusZh: Record<string, string> = { new: "新", learning: "學習中", weak: "弱", known: "已會" };
const statusCls: Record<string, string> = {
  weak: "bg-red-500/15 text-red-400",
  learning: "bg-gold/15 text-gold",
  new: "bg-ink-700 text-slate-400",
  known: "bg-accent/15 text-accent",
};

export default function ReviewView({ kind, title, subtitle }: { kind: ReviewKind; title: string; subtitle: string }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [onlyDue, setOnlyDue] = useState(true);
  // 閃卡模式
  const [flash, setFlash] = useState(false);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [qi, setQi] = useState(0);
  const [stage, setStage] = useState(0); // 0=英文 1=+中文 2=+句子

  // ── TTS(語音朗讀) ──
  function speak(text: string, lang = "en-US") {
    try {
      const s = window.speechSynthesis;
      if (!s || !text) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = lang.startsWith("zh") ? 1.0 : 0.95;
      s.speak(u);
    } catch {}
  }
  function unlockTTS() { try { const s = window.speechSynthesis; if (!s) return; s.resume(); const u = new SpeechSynthesisUtterance(" "); u.volume = 0; s.speak(u); } catch {} }

  async function load() {
    await initContent(); // 確保 vocabBank(中文/例句)已載入
    setItems(await getReviewItems(kind));
    setLoaded(true);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kind]);

  // 取得卡片內容(英文/中文/例句)
  function cardOf(it: ReviewItem) {
    return kind === "word" ? wordFlashcard(it.text) : { word: it.text, zh: it.native_zh, sentence: it.text, sentenceZh: it.native_zh };
  }
  // 自動朗讀:英文(word)→ 英文(word)→ 句子;句子卡都唸英文句
  useEffect(() => {
    if (!flash || !queue[qi]) return;
    const fc = cardOf(queue[qi]);
    if (kind === "word") speak(stage >= 2 ? (fc.sentence || fc.word) : fc.word, "en-US");
    else speak(fc.sentence, "en-US");
    /* eslint-disable-next-line */
  }, [flash, qi, stage]);

  async function mark(it: ReviewItem, event: "correct" | "unknown") {
    await logReview({ kind, ref: it.ref, text: it.text, nativeZh: it.native_zh, patternId: it.pattern_id, event });
    load();
  }

  const due = items.filter(isDue);
  const shown = onlyDue ? due : items;

  // ── 進入閃卡:Box 小的先複習 ──
  function startFlash() {
    const pool = (onlyDue ? due : items).slice().sort((a, b) => (a.box ?? 0) - (b.box ?? 0) || b.wrong_count - a.wrong_count);
    if (!pool.length) return;
    unlockTTS(); // 在點擊手勢當下解鎖手機語音
    setQueue(pool); setQi(0); setStage(0); setFlash(true);
  }
  async function answer(it: ReviewItem, remembered: boolean) {
    // 記住 → 升 box;還差一點點 → box 歸零(進入更密集複習)
    await logReview({ kind, ref: it.ref, text: it.text, nativeZh: it.native_zh, patternId: it.pattern_id, event: remembered ? "correct" : "unknown" });
    if (qi + 1 >= queue.length) { setFlash(false); load(); }
    else { setQi(qi + 1); setStage(0); }
  }

  // ── 閃卡畫面 ──
  if (flash && queue[qi]) {
    const it = queue[qi];
    const fc = cardOf(it);
    const maxStage = kind === "word" ? 2 : 1; // 句子複習沒有「另一句例句」
    const last = stage >= maxStage;
    return (
      <Shell>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-slate-400">🃏 閃卡 · {qi + 1} / {queue.length}</span>
          <button onClick={() => { setFlash(false); load(); }} className="btn-ghost px-3 py-1.5 text-xs">結束</button>
        </div>
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(qi / queue.length) * 100}%` }} />
        </div>

        <div className="card flex min-h-[340px] flex-col items-center justify-center gap-5 p-6 text-center">
          <span className={`chip text-[10px] ${statusCls[it.status] ?? statusCls.new}`}>Box {it.box ?? 0} · {statusZh[it.status] ?? it.status}</span>
          {/* 英文(永遠顯示) */}
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-slate-100">{kind === "word" ? fc.word : fc.sentence}</div>
            <button onClick={() => speak(kind === "word" ? (stage >= 2 ? (fc.sentence || fc.word) : fc.word) : fc.sentence, "en-US")} className="text-xl text-slate-500 hover:text-accent" title="再聽一次">🔊</button>
          </div>
          {/* 中文(stage ≥ 1) */}
          {stage >= 1 ? (
            <div className="text-xl text-gold">{fc.zh || "(無中文)"}</div>
          ) : (
            <div className="text-sm text-slate-600">想一下中文是什麼…</div>
          )}
          {/* 例句(word 模式 stage ≥ 2) */}
          {kind === "word" && stage >= 2 && (
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3">
              <div className="text-lg font-medium text-accent">{fc.sentence || "(無例句)"}</div>
              {fc.sentenceZh && <div className="mt-1 text-sm text-slate-500">{fc.sentenceZh}</div>}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-center gap-3">
          {!last ? (
            <button onClick={() => setStage(stage + 1)} className="btn-primary px-10 py-3">下一步 →</button>
          ) : (
            <>
              <button onClick={() => answer(it, false)} className="btn-ghost flex-1 max-w-[180px] py-3 text-red-400">還差一點點</button>
              <button onClick={() => answer(it, true)} className="btn-primary flex-1 max-w-[180px] py-3">我記住了 ✓</button>
            </>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-slate-600">記住 → 間隔變長(升 Box);還差一點點 → 回到密集複習。</p>
      </Shell>
    );
  }

  // ── 清單畫面 ──
  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {!hasSupabase ? (
        <div className="card p-5 text-center text-sm text-slate-500">需連接 Supabase 才有複習紀錄。</div>
      ) : !loaded ? (
        <div className="card p-5 text-center text-sm text-slate-500">載入中…</div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="card flex-1 p-4">
              <div className="text-3xl font-black text-red-400">{due.length}</div>
              <div className="text-xs text-slate-500">待複習(到期 / 弱)</div>
            </div>
            <div className="card flex-1 p-4">
              <div className="text-3xl font-black text-slate-200">{items.length}</div>
              <div className="text-xs text-slate-500">總項目</div>
            </div>
          </div>

          <button onClick={startFlash} disabled={shown.length === 0} className={`btn-primary mb-3 w-full py-3 ${shown.length === 0 ? "opacity-40" : ""}`}>
            🃏 開始閃卡複習({shown.length})· Box 小的先
          </button>

          <button onClick={() => setOnlyDue((v) => !v)} className="mb-3 text-xs text-slate-500 underline">
            {onlyDue ? "顯示全部" : "只看待複習"}
          </button>

          {shown.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-500">
              {onlyDue ? "目前沒有待複習項目 🎉" : "還沒有任何紀錄。去操練時標記「不熟」就會進來。"}
            </div>
          ) : (
            <ul className="space-y-2">
              {shown.map((it) => (
                <li key={it.ref} className="card flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-slate-100">{it.text}</div>
                    {it.native_zh && <div className="truncate text-xs text-slate-500">{it.native_zh}</div>}
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`chip text-[10px] ${statusCls[it.status] ?? statusCls.new}`}>{statusZh[it.status] ?? it.status}</span>
                      <span className="text-[10px] text-slate-600">Box {it.box ?? 0}</span>
                      {it.wrong_count > 0 && <span className="text-[10px] text-slate-600">錯 {it.wrong_count} 次</span>}
                    </div>
                  </div>
                  <button onClick={() => mark(it, "unknown")} className="chip bg-red-500/15 text-[11px] text-red-400">不熟</button>
                  <button onClick={() => mark(it, "correct")} className="chip bg-accent/15 text-[11px] text-accent">會了</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Shell>
  );
}
