"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  lessons,
  learningPath,
  getLesson,
  framesOf,
  vocabByCategory,
  vocabCategories,
  subFrameCount,
  isExtraFrame,
} from "@/lib/mock";
import {
  initContent,
  addFrame,
  removeFrame,
  getWordbooks,
  createWordbook,
  removeWordbook,
  addWordToBook,
  removeWordFromBook,
  addWordsToBook,
  seedToDb,
  patternVocabCount,
  patternVocabTotal,
} from "@/lib/content";
import { hasSupabase } from "@/lib/supabase";

type Tab = "patterns" | "wordbook" | "patternvocab";

export default function AdminPage() {
  const [, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const refresh = () => setTick((t) => t + 1);
  useEffect(() => { initContent().then(() => { setReady(true); refresh(); }); }, []);
  const [tab, setTab] = useState<Tab>("patterns");
  const [seedMsg, setSeedMsg] = useState("");
  const [seeding, setSeeding] = useState(false);
  async function seed() {
    setSeeding(true);
    setSeedMsg(await seedToDb());
    setSeeding(false);
  }

  return (
    <div className="min-h-screen bg-ink-950">
      {/* 後台專屬頂列（與前台分開）*/}
      <header className="sticky top-0 z-10 border-b border-ink-700 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-sm font-black text-ink-950">⚙</span>
          <div className="leading-tight">
            <div className="text-sm font-bold">後台 · 內容管理</div>
            <div className="text-[11px] text-slate-500">Admin · {hasSupabase ? "已連 Supabase 資料庫 ☁️" : "資料存 localStorage(未連資料庫)"}</div>
          </div>
          <Link href="/" className="btn-ghost ml-auto px-3 py-1.5 text-xs">← 回前台</Link>
        </div>
        <div className="mx-auto flex max-w-4xl gap-1 px-4 pb-2">
          {([["patterns", "句型管理"], ["wordbook", "詞本"], ["patternvocab", "句型詞庫"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-accent text-ink-950 font-semibold" : "text-slate-400 hover:bg-ink-800"}`}>{label}</button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">
        {/* 種子上傳到資料庫 */}
        <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-300">把種子內容上傳到資料庫</div>
            <div className="text-xs text-slate-500">{hasSupabase ? "把程式內建的單字 + 句型課寫進 Supabase(可重複執行,以 upsert 更新)。" : "尚未設定 Supabase(NEXT_PUBLIC_SUPABASE_*),目前存 localStorage。"}</div>
          </div>
          <button onClick={seed} disabled={!hasSupabase || seeding} className="btn-primary">{seeding ? "上傳中…" : "⬆ 上傳種子"}</button>
          {seedMsg && <div className="w-full text-sm text-accent">{seedMsg}</div>}
        </div>

        {!ready ? (
          <p className="text-center text-sm text-slate-500">載入內容中…</p>
        ) : (
          <>
            {tab === "patterns" && <PatternsAdmin onChange={refresh} />}
            {tab === "wordbook" && <WordbookAdmin onChange={refresh} />}
            {tab === "patternvocab" && <PatternVocabAdmin />}
          </>
        )}
      </main>
    </div>
  );
}

const builtLessonIds = () => learningPath.flatMap((c) => c.units.filter((u) => u.lessonId).map((u) => u.lessonId!));

// ─────────── 句型(句框)管理 ───────────
function PatternsAdmin({ onChange }: { onChange: () => void }) {
  const ids = builtLessonIds();
  const [lessonId, setLessonId] = useState(ids[0] ?? lessons[0].id);
  const lesson = getLesson(lessonId);
  const cats = vocabCategories();
  const [frame, setFrame] = useState("");
  const [frameZh, setFrameZh] = useState("");
  const [category, setCategory] = useState(cats[0] ?? "");
  const frames = framesOf(lesson);

  function add() {
    if (!frame.includes("___") || !frameZh.includes("___") || !category) return;
    addFrame(lessonId, { frame: frame.trim(), frameZh: frameZh.trim(), category });
    setFrame(""); setFrameZh(""); onChange();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="text-xs text-slate-500">選句型課</label>
        <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none">
          {ids.map((id) => <option key={id} value={id}>Unit {getLesson(id).unit} · {getLesson(id).patternText}</option>)}
        </select>
      </div>
      <div className="card p-4">
        <div className="mb-2 text-sm font-semibold text-slate-300">句框({frames.length})</div>
        <ul className="space-y-2">
          {frames.map((f) => (
            <li key={f.frame} className="flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-2">
              <div className="min-w-0 flex-1">
                <code className="text-sm text-slate-100">{f.frame}</code>
                <div className="text-xs text-slate-500">{f.frameZh} · {f.category} · {subFrameCount(f)} 字</div>
              </div>
              {isExtraFrame(lessonId, f.frame)
                ? <button onClick={() => { removeFrame(lessonId, f.frame); onChange(); }} className="chip bg-red-500/15 text-[10px] text-red-400">刪除</button>
                : <span className="chip bg-ink-700 text-[10px] text-slate-500">種子</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-4">
        <div className="mb-2 text-sm font-semibold text-slate-300">新增句框</div>
        <p className="mb-3 text-xs text-slate-500">句框與中文模板都要含 <code>___</code>。</p>
        <div className="space-y-2">
          <input value={frame} onChange={(e) => setFrame(e.target.value)} placeholder="英文句框，例：I want to eat ___." className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600" />
          <input value={frameZh} onChange={(e) => setFrameZh(e.target.value)} placeholder="中文模板，例：我想吃 ___。" className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none">
            {cats.map((c) => <option key={c} value={c}>{c}（{vocabByCategory(c).length} 字）</option>)}
          </select>
          <button onClick={add} className="btn-primary w-full">+ 新增句框</button>
        </div>
      </div>
    </div>
  );
}

// ─────────── 詞本（多本、具名，只存英文單詞）───────────
function WordbookAdmin({ onChange }: { onChange: () => void }) {
  const books = getWordbooks();
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<string | null>(books[0]?.name ?? null);
  const [word, setWord] = useState("");
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");

  const book = books.find((b) => b.name === selected) ?? books[0] ?? null;

  async function create() {
    const n = newName.trim();
    if (await createWordbook(n)) { setNewName(""); setSelected(n); onChange(); }
  }
  async function one() {
    if (book && (await addWordToBook(book.name, word))) { setWord(""); onChange(); }
  }
  async function many() {
    if (!book) return;
    const list = bulk.split(/[\n,]/).map((w) => w.trim()).filter(Boolean);
    const n = await addWordsToBook(book.name, list);
    setMsg(`已新增 ${n} 個單詞`);
    setBulk("");
    onChange();
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) f.text().then((t) => setBulk(t));
  }

  return (
    <div className="space-y-4">
      {/* 新增詞本 */}
      <div className="card p-4">
        <div className="mb-2 text-sm font-semibold text-slate-300">新增詞本</div>
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="詞本名稱,例：機場常用字" className="flex-1 rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600" />
          <button onClick={create} className="btn-primary">+ 建立</button>
        </div>
      </div>

      {/* 詞本清單(可選) */}
      {books.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 text-sm font-semibold text-slate-300">我的詞本({books.length})</div>
          <div className="flex flex-wrap gap-2">
            {books.map((b) => (
              <button key={b.name} onClick={() => setSelected(b.name)} className={`chip ${book?.name === b.name ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>
                {b.name}({b.words.length})
                <span onClick={async (e) => { e.stopPropagation(); if (confirm(`刪除詞本「${b.name}」?`)) { await removeWordbook(b.name); if (selected === b.name) setSelected(null); onChange(); } }} className="ml-1 text-red-400">✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!book ? (
        <p className="text-center text-sm text-slate-500">先建立一個詞本,再上傳單字。</p>
      ) : (
        <>
          {/* 單一新增 */}
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold text-slate-300">「{book.name}」· {book.words.length} 個單詞 — 新增</div>
            <div className="flex gap-2">
              <input value={word} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => e.key === "Enter" && one()} placeholder="英文單詞,例：boarding pass" className="flex-1 rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600" />
              <button onClick={one} className="btn-primary">+ 新增</button>
            </div>
          </div>

          {/* 批量上傳 */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">批量上傳到「{book.name}」(一行或逗號一個)</span>
              <label className="chip cursor-pointer bg-ink-700 text-slate-300">選檔(.txt/.csv)<input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={onFile} className="hidden" /></label>
            </div>
            <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={6} placeholder={"boarding pass\ngate\nlayover\ncarry-on"} className="w-full resize-y rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-600" />
            <div className="mt-2 flex items-center justify-end gap-2">
              {msg && <span className="text-sm text-accent">{msg}</span>}
              <button onClick={many} className="btn-primary">匯入</button>
            </div>
          </div>

          {/* 單詞清單 */}
          {book.words.length > 0 && (
            <div className="card p-4">
              <div className="mb-2 text-sm font-semibold text-slate-300">單詞清單</div>
              <div className="flex flex-wrap gap-2">
                {book.words.map((w) => (
                  <span key={w} className="chip bg-ink-800 text-slate-300">
                    {w}
                    <button onClick={async () => { await removeWordFromBook(book.name, w); onChange(); }} className="ml-1 text-red-400">✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ─────────── 句型詞庫(pattern_vocab)對應 ───────────
function PatternVocabAdmin() {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold text-slate-300">句型詞庫 (pattern_vocab) · 共 {patternVocabTotal()} 字</div>
        <p className="mt-1 text-xs text-slate-500">
          由「AI 一次性分類詞本」產生(分類 + 中文)→ 存進 <code>pattern_vocab</code> 表。下表顯示每個句型的句框對應哪個分類,以及該分類目前在種子 / 句型詞庫各有幾個字。AI 分類待跑,跑完「句型詞庫」欄就會有數字。
        </p>
      </div>
      {lessons.map((l) => (
        <div key={l.id} className="card p-4">
          <div className="mb-2 text-sm font-semibold text-accent">Unit {l.unit} · {l.patternText}</div>
          <ul className="space-y-1.5">
            {framesOf(l).map((f) => (
              <li key={f.frame} className="flex flex-wrap items-center gap-2 text-sm">
                <code className="min-w-0 flex-1 text-slate-200">{f.frame}</code>
                <span className="chip bg-ink-700 text-slate-300">分類 {f.category}</span>
                <span className="chip bg-ink-800 text-slate-500">種子 {vocabByCategory(f.category).length}</span>
                <span className="chip bg-accent/15 text-accent">詞庫 {patternVocabCount(f.category)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
