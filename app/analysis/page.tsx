"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { getReviewItems, type ReviewItem } from "@/lib/review";
import { getSessions, slowByLesson } from "@/lib/practice";
import { getErrorStats } from "@/lib/content";
import { getLesson } from "@/lib/mock";
import { analyzeLearning, type LearnAnalysis } from "@/lib/ai";
import { hasSupabase } from "@/lib/supabase";

const isWeak = (it: ReviewItem) => it.status === "weak" || it.wrong_count > 0;
const byWrong = (a: ReviewItem, b: ReviewItem) => b.wrong_count - a.wrong_count || a.box - b.box;

export default function AnalysisPage() {
  const [words, setWords] = useState<ReviewItem[]>([]);
  const [sentences, setSentences] = useState<ReviewItem[]>([]);
  const [drills, setDrills] = useState<ReviewItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ai, setAi] = useState<LearnAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [slow, setSlow] = useState<{ lesson_id: string; avg: number; count: number }[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => {
    Promise.all([getReviewItems("word"), getReviewItems("sentence"), getReviewItems("drill")]).then(([w, s, d]) => {
      setWords(w.filter(isWeak).sort(byWrong));
      setSentences(s.filter(isWeak).sort(byWrong));
      setDrills(d.filter(isWeak).sort(byWrong));
      setLoaded(true);
    });
    getSessions().then((ss) => setSlow(slowByLesson(ss).filter((x) => x.avg >= 2).slice(0, 6)));
    getErrorStats().then(setTags);
  }, []);

  async function runAI() {
    setAiLoading(true); setAiMsg("");
    const payload = {
      weakWords: words.slice(0, 30).map((w) => ({ word: w.text, wrong: w.wrong_count })),
      weakSentences: sentences.slice(0, 20).map((s) => ({ sentence: s.text, wrong: s.wrong_count })),
      weakPatterns: drills.slice(0, 20).map((d) => ({ pattern: d.text, wrong: d.wrong_count })),
    };
    const r = await analyzeLearning(payload);
    setAiLoading(false);
    if (r) setAi(r);
    else setAiMsg("AI 分析需要設定 OpenAI 金鑰(或暫時無法使用)。");
  }

  const card = (label: string, n: number, accent: string) => (
    <div className="card p-4">
      <div className={`text-3xl font-black ${accent}`}>{n}</div>
      <div className="mt-1 text-sm text-slate-300">{label}</div>
    </div>
  );

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">學習分析</h1>
        <p className="mt-1 text-sm text-slate-500">依你的真實練習紀錄,找出最該加強的地方。</p>
      </div>

      {!hasSupabase ? (
        <div className="card p-5 text-center text-sm text-slate-500">需連 Supabase 才有分析資料。</div>
      ) : !loaded ? (
        <div className="card p-5 text-center text-sm text-slate-500">載入中…</div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            {card("弱單字", words.length, "text-red-400")}
            {card("弱句子", sentences.length, "text-red-400")}
            {card("弱句型", drills.length, "text-red-400")}
          </div>

          {/* AI 深入分析 */}
          <div className="card mb-4 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">AI 深入分析</div>
              <button onClick={runAI} disabled={aiLoading} className="btn-primary text-sm">{aiLoading ? "分析中…" : "🤖 分析我的學習"}</button>
            </div>
            {aiMsg && <p className="mt-2 text-xs text-gold">{aiMsg}</p>}
            {ai && (
              <div className="mt-3 rounded-xl border border-ink-700 bg-ink-900/40 p-3 text-sm">
                <p className="text-slate-200">{ai.summary}</p>
                {ai.tips.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                    {ai.tips.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                )}
              </div>
            )}
            {!ai && !aiMsg && <p className="mt-2 text-xs text-slate-500">免費的話直接看下面清單;想要個人化建議再按 AI(會用一次額度)。</p>}
          </div>

          <Section title="弱句型" items={drills} href="/" hrefLabel="練這個" empty="目前沒有弱句型 🎉" />

          {/* 反應太慢 */}
          <div className="card mb-4 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-300">反應太慢(Slow Responses)</div>
            {slow.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-600">還沒有足夠資料(多練幾輪)。</p>
            ) : (
              <ul className="space-y-1.5">
                {slow.map((s) => (
                  <li key={s.lesson_id} className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/40 px-2.5 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate text-slate-100">{getLesson(s.lesson_id).patternText}</span>
                    <span className="chip bg-gold/15 text-[10px] text-gold">平均 {s.avg.toFixed(1)}s</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 常錯結構(AI 評分累積) */}
          <div className="card mb-4 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-300">常錯結構(Incorrect Structures)</div>
            {tags.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-600">開 🤖 AI 評分練習後,這裡會累積(冠詞/時態/介係詞…)。</p>
            ) : (
              <ul className="space-y-1.5">
                {tags.map((t) => (
                  <li key={t.tag} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-900/40 px-2.5 py-1.5 text-sm">
                    <span className="text-slate-100">{t.tag}</span>
                    <span className="text-xs text-slate-500">出現 {t.count} 次</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Section title="弱單字" items={words} href="/words" hrefLabel="去單詞複習" empty="目前沒有弱單字 🎉" />
          <Section title="弱句子" items={sentences} href="/sentences" hrefLabel="去句子複習" empty="目前沒有弱句子 🎉" />
        </>
      )}
    </Shell>
  );
}

function Section({ title, items, href, hrefLabel, empty }: { title: string; items: ReviewItem[]; href: string; hrefLabel: string; empty: string }) {
  return (
    <div className="card mb-4 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">{title}({items.length})</span>
        {items.length > 0 && <Link href={href} className="chip bg-accent/15 text-[11px] text-accent">{hrefLabel} →</Link>}
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-center text-xs text-slate-600">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 12).map((it) => (
            <li key={it.ref} className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/40 px-2.5 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-slate-100">{it.text}</span>
              {it.wrong_count > 0 && <span className="chip bg-red-500/15 text-[10px] text-red-400">錯 {it.wrong_count}</span>}
              <span className="text-[10px] text-gold">B{it.box}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
