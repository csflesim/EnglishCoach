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
  isExtraVocab,
  type SubFrame,
  type VocabWord,
} from "@/lib/mock";
import {
  initContent,
  addFrame,
  removeFrame,
  addVocab,
  removeVocab,
  addVocabBulk,
  addFramesBulk,
  getWordbooks,
  createWordbook,
  removeWordbook,
  addWordToBook,
  removeWordFromBook,
  addWordsToBook,
  seedToDb,
} from "@/lib/content";
import { hasSupabase } from "@/lib/supabase";

type Tab = "patterns" | "vocab" | "wordbook" | "bulk";

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
          {([["patterns", "句型管理"], ["vocab", "單字庫"], ["wordbook", "詞本"], ["bulk", "批量上傳"]] as [Tab, string][]).map(([t, label]) => (
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
            {tab === "vocab" && <VocabAdmin onChange={refresh} />}
            {tab === "wordbook" && <WordbookAdmin onChange={refresh} />}
            {tab === "bulk" && <BulkAdmin onChange={refresh} />}
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

// ─────────── 單字庫管理 ───────────
function VocabAdmin({ onChange }: { onChange: () => void }) {
  const cats = vocabCategories();
  const [category, setCategory] = useState(cats[0] ?? "");
  const [word, setWord] = useState("");
  const [nativeZh, setNativeZh] = useState("");
  const words = vocabByCategory(category);

  function add() {
    if (!word.trim() || !nativeZh.trim() || !category) return;
    addVocab({ word: word.trim(), nativeZh: nativeZh.trim(), category });
    setWord(""); setNativeZh(""); onChange();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="text-xs text-slate-500">分類({cats.length})</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none">
          {cats.map((c) => <option key={c} value={c}>{c}（{vocabByCategory(c).length} 字）</option>)}
        </select>
        {words.length < 20 && <p className="mt-2 text-xs text-gold">⚠ 此分類只有 {words.length} 字,建議補到 20。</p>}
      </div>
      <div className="card p-4">
        <div className="mb-2 text-sm font-semibold text-slate-300">{category} · {words.length} 字</div>
        <div className="flex flex-wrap gap-2">
          {words.map((w) => (
            <span key={w.word + w.category} className={`chip ${isExtraVocab(w.word, w.category) ? "bg-accent/15 text-accent" : "bg-ink-800 text-slate-300"}`}>
              {w.word} / {w.nativeZh}
              {isExtraVocab(w.word, w.category) && <button onClick={() => { removeVocab(w.word, w.category); onChange(); }} className="ml-1 text-red-400">✕</button>}
            </span>
          ))}
        </div>
      </div>
      <div className="card p-4">
        <div className="mb-2 text-sm font-semibold text-slate-300">新增單字</div>
        <div className="space-y-2">
          <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="英文,例：a sandwich" className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600" />
          <input value={nativeZh} onChange={(e) => setNativeZh(e.target.value)} placeholder="中文,例：三明治" className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none">
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={add} className="btn-primary w-full">+ 新增單字</button>
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

// ─────────── 批量上傳 ───────────
function parseTriples(text: string): { a: string; b: string; c: string }[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      const j = JSON.parse(t);
      const arr = Array.isArray(j) ? j : [j];
      return arr.map((o: Record<string, unknown>) => ({
        a: String(o.word ?? o.frame ?? o.a ?? "").trim(),
        b: String(o.nativeZh ?? o.frameZh ?? o.b ?? "").trim(),
        c: String(o.category ?? o.c ?? "").trim(),
      }));
    } catch {
      return [];
    }
  }
  return t.split(/\r?\n/).map((line) => line.split(",")).filter((p) => p.length >= 3).map((p) => ({ a: p[0].trim(), b: p[1].trim(), c: p.slice(2).join(",").trim() }));
}

function BulkAdmin({ onChange }: { onChange: () => void }) {
  const ids = builtLessonIds();
  const [target, setTarget] = useState<"vocab" | "frames">("vocab");
  const [lessonId, setLessonId] = useState(ids[0] ?? lessons[0].id);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  const rows = parseTriples(text);
  const valid = target === "vocab"
    ? rows.filter((r) => r.a && r.b && r.c)
    : rows.filter((r) => r.a.includes("___") && r.b.includes("___") && r.c);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => setText(t));
  }
  function doImport() {
    let n = 0;
    if (target === "vocab") {
      n = addVocabBulk(valid.map<VocabWord>((r) => ({ word: r.a, nativeZh: r.b, category: r.c })));
    } else {
      n = addFramesBulk(lessonId, valid.map<SubFrame>((r) => ({ frame: r.a, frameZh: r.b, category: r.c })));
    }
    setMsg(`已匯入 ${n} 筆`);
    setText("");
    onChange();
  }

  const placeholder = target === "vocab"
    ? "每行一筆：英文,中文,分類\n例：\na sandwich,三明治,need_buy\na salad,沙拉,need_buy\n\n或貼 JSON：[{\"word\":\"a sandwich\",\"nativeZh\":\"三明治\",\"category\":\"need_buy\"}]"
    : "每行一筆：英文句框,中文模板,分類（都要含 ___）\n例：\nI want to eat ___.,我想吃 ___。,need_buy\n\n或貼 JSON：[{\"frame\":\"I want to eat ___.\",\"frameZh\":\"我想吃 ___。\",\"category\":\"need_buy\"}]";

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-2 text-sm font-semibold text-slate-300">批量上傳目標</div>
        <div className="flex gap-2">
          <button onClick={() => setTarget("vocab")} className={target === "vocab" ? "btn-primary" : "btn-ghost"}>單字庫</button>
          <button onClick={() => setTarget("frames")} className={target === "frames" ? "btn-primary" : "btn-ghost"}>句型(句框)</button>
        </div>
        {target === "frames" && (
          <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="mt-3 w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 outline-none">
            {ids.map((id) => <option key={id} value={id}>加到 Unit {getLesson(id).unit} · {getLesson(id).patternText}</option>)}
          </select>
        )}
      </div>

      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-300">貼上 CSV 或 JSON</span>
          <label className="chip cursor-pointer bg-ink-700 text-slate-300">
            選檔(.csv/.json)
            <input type="file" accept=".csv,.json,text/csv,application/json" onChange={onFile} className="hidden" />
          </label>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={placeholder} className="w-full resize-y rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-600" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">解析到 <span className="text-slate-200">{valid.length}</span> 筆有效{rows.length > valid.length ? `(${rows.length - valid.length} 筆格式不符略過)` : ""}</span>
          <button onClick={doImport} disabled={!valid.length} className="btn-primary">匯入 {valid.length} 筆</button>
        </div>
        {msg && <p className="mt-2 text-sm text-accent">{msg}</p>}
      </div>

      {/* 預覽 */}
      {valid.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 text-sm font-semibold text-slate-300">預覽(前 10 筆)</div>
          <ul className="space-y-1 text-xs">
            {valid.slice(0, 10).map((r, i) => (
              <li key={i} className="flex gap-2 text-slate-300"><code className="text-slate-100">{r.a}</code><span className="text-slate-500">/ {r.b} / {r.c}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
