"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  lessons,
  learningPath,
  getLesson,
  framesOf,
  frameDisplay,
  vocabByCategory,
  vocabCategories,
  subFrameCount,
} from "@/lib/mock";
import {
  initContent,
  addFrame,
  removeFrame,
  getWordbooks,
  createWordbook,
  removeWordbook,
  addWordsToBook,
  wordbookCount,
  getBookWords,
  getActiveWordbook,
  setActiveWordbook,
  seedToDb,
  type VocabView,
} from "@/lib/content";
import { hasSupabase } from "@/lib/supabase";

type Tab = "patterns" | "wordbook";

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
          {([["patterns", "句型管理"], ["wordbook", "詞本"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-accent text-ink-950 font-semibold" : "text-slate-400 hover:bg-ink-800"}`}>{label}</button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">
        {/* 種子上傳到資料庫 */}
        <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-300">把種子內容上傳到資料庫</div>
            <div className="text-xs text-slate-500">{hasSupabase ? "把程式內建的學習地圖 + 句型寫進 Supabase(cycles/units/patterns;單字不上傳,改由詞本+AI)。" : "尚未設定 Supabase(NEXT_PUBLIC_SUPABASE_*),目前存 localStorage。"}</div>
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

  async function add() {
    if (!frame.includes("___") || !frameZh.includes("___") || !category) return;
    await addFrame(lessonId, { frame: frame.trim(), frameZh: frameZh.trim(), category });
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
          {frames.map((f, i) => (
            <li key={`${f.frame}-${i}`} className="flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-2">
              <div className="min-w-0 flex-1">
                <code className="text-sm text-slate-100">{frameDisplay(f)}</code>
                <div className="text-xs text-slate-500">{f.frameZh} · {f.category} · {subFrameCount(f)} 字</div>
              </div>
              <button onClick={async () => { await removeFrame(lessonId, f.frame); onChange(); }} className="chip bg-red-500/15 text-[10px] text-red-400">刪除</button>
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

// ─────────── 詞本（catalog;單字進 vocabulary.wordbooks 陣列）───────────
const PAGE = 60;
function WordbookAdmin({ onChange }: { onChange: () => void }) {
  const catalog = getWordbooks();
  const names = catalog.map((b) => b.name);
  const labelOf = (n: string) => catalog.find((b) => b.name === n)?.label;
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<string | null>(names[0] ?? null);
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [active, setActive] = useState<string | null>(null);
  // 單詞檢視
  const [words, setWords] = useState<VocabView[]>([]);
  const [search, setSearch] = useState("");
  const [more, setMore] = useState(false);

  const book = selected && names.includes(selected) ? selected : names[0] ?? null;

  useEffect(() => { setActive(getActiveWordbook()); }, []);
  useEffect(() => {
    let on = true;
    if (book) wordbookCount(book).then((c) => on && setCount(c));
    else setCount(null);
    return () => { on = false; };
  }, [book, msg]);
  // 載入單詞(換書 / 搜尋 / 匯入後)
  useEffect(() => {
    let on = true;
    if (!book) { setWords([]); return; }
    getBookWords(book, 0, PAGE, search).then((w) => { if (on) { setWords(w); setMore(w.length === PAGE); } });
    return () => { on = false; };
  }, [book, search, msg]);

  async function create() {
    const n = newName.trim();
    if (await createWordbook(n)) { setNewName(""); setSelected(n); onChange(); }
  }
  async function many() {
    if (!book) return;
    const list = bulk.split(/[\n,]/).map((w) => w.trim()).filter(Boolean);
    const n = await addWordsToBook(book, list);
    setMsg(`已新增 ${n} 個單詞到「${book}」`);
    setBulk("");
    onChange();
  }
  async function loadMore() {
    if (!book) return;
    const next = await getBookWords(book, words.length, PAGE, search);
    setWords((w) => [...w, ...next]);
    setMore(next.length === PAGE);
  }
  function makeActive(n: string) { setActiveWordbook(n); setActive(n); }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) f.text().then((t) => setBulk(t));
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-2 text-sm font-semibold text-slate-300">新增詞本</div>
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="詞本名稱,例：機場常用字" className="flex-1 rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600" />
          <button onClick={create} className="btn-primary">+ 建立</button>
        </div>
      </div>

      {names.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 text-sm font-semibold text-slate-300">我的詞本({names.length}) · 點選查看;⭐ = 目前使用</div>
          <div className="flex flex-wrap gap-2">
            {names.map((n) => (
              <button key={n} onClick={() => setSelected(n)} className={`chip ${book === n ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>
                {active === n && "⭐ "}{n}{labelOf(n) ? `(${labelOf(n)})` : ""}
                <span onClick={async (e) => { e.stopPropagation(); if (confirm(`刪除詞本「${n}」?(字仍留在單字庫)`)) { await removeWordbook(n); if (selected === n) setSelected(null); onChange(); } }} className="ml-1 text-red-400">✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!book ? (
        <p className="text-center text-sm text-slate-500">先建立一個詞本,再上傳單字。</p>
      ) : (
        <>
          {/* 使用中 + 計數 */}
          <div className="card flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 text-sm">
              <span className="font-semibold text-slate-200">{book}{labelOf(book) ? `(${labelOf(book)})` : ""}</span>
              {count !== null && <span className="ml-2 text-slate-500">{count} 字</span>}
            </div>
            {active === book ? (
              <span className="chip bg-accent/15 text-accent">⭐ 目前使用中</span>
            ) : (
              <button onClick={() => makeActive(book)} className="btn-ghost text-sm">設為目前使用</button>
            )}
          </div>

          {/* 單詞檢視 */}
          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-300">單詞</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋…" className="ml-auto w-40 rounded-lg border border-ink-700 bg-ink-900/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-600" />
            </div>
            {words.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-600">{search ? "查無單詞" : "此詞本還沒有單詞"}</p>
            ) : (
              <>
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {words.map((w) => (
                    <li key={w.word} className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/40 px-2.5 py-1.5 text-sm">
                      <span className="text-slate-100">{w.word}</span>
                      {w.pos && <span className="chip bg-accent/10 text-[10px] text-accent">{w.pos}</span>}
                      {w.native_zh && <span className="truncate text-xs text-slate-500">{w.native_zh}</span>}
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
                        <span title="難易分數" className="text-slate-400">{w.difficulty ?? "—"}</span>
                        <span className="text-slate-700">|</span>
                        <span title="記憶 box" className="text-gold">B{w.box ?? 0}</span>
                        <span className="text-slate-700">|</span>
                        <span title="分類" className="chip bg-ink-700 text-[10px] text-slate-400">{w.categories?.join("/") || "—"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {more && <button onClick={loadMore} className="btn-ghost mt-3 w-full text-sm">載入更多</button>}
              </>
            )}
          </div>

          {/* 批量上傳 */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">批量上傳到「{book}」</span>
              <label className="chip cursor-pointer bg-ink-700 text-slate-300">選檔(.txt/.csv)<input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={onFile} className="hidden" /></label>
            </div>
            <p className="mb-2 text-xs text-slate-500">一行或逗號一個。字會存進共用單字庫並連到此詞本;分類/中文之後由 AI 補。</p>
            <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} placeholder={"boarding pass\ngate\nlayover"} className="w-full resize-y rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-600" />
            <div className="mt-2 flex items-center justify-end gap-2">
              {msg && <span className="text-sm text-accent">{msg}</span>}
              <button onClick={many} className="btn-primary">匯入</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
