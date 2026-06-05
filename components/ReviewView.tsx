"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { getReviewItems, logReview, isDue, type ReviewItem, type ReviewKind } from "@/lib/review";
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

  async function load() {
    setItems(await getReviewItems(kind));
    setLoaded(true);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kind]);

  async function mark(it: ReviewItem, event: "correct" | "unknown") {
    await logReview({ kind, ref: it.ref, text: it.text, nativeZh: it.native_zh, patternId: it.pattern_id, event });
    load();
  }

  const due = items.filter(isDue);
  const shown = onlyDue ? due : items;

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
