-- English Reflex Coach — Supabase schema (正規化版 v2)
-- 在 SQL Editor 整段貼上執行。⚠️ 會移除舊的 kv / pattern_vocab,並重建 units/patterns/vocabulary。
-- 自用版:全部「匿名可讀寫」(個人工具);多人前改 Supabase Auth + 嚴格 policy。

-- ── 移除舊結構 ──
drop table if exists pattern_vocab cascade;
drop table if exists kv cascade;
drop table if exists wordbook_vocab cascade;
drop table if exists patterns cascade;
drop table if exists units cascade;
drop table if exists cycles cascade;
drop table if exists vocabulary cascade;
drop table if exists progress cascade;
drop table if exists review_events cascade;
drop table if exists review_items cascade;

-- ── 三週期(點火/慣性/融合)──
create table cycles (
  cycle int primary key,
  title text not null,
  clb text not null
);

-- ── 單元:目標 / 重點 / 句型 ──
create table units (
  unit int primary key,
  cycle int references cycles(cycle),
  goal text not null,
  focus text not null,
  pattern text not null,
  lesson_id text
);

-- ── 句型操練:每 unit 每 type 一列 ──
create table patterns (
  id text primary key,                 -- 例 L_am__substitution
  unit int references units(unit),
  type text not null,                  -- substitution / transformation / expansion / response
  transform_frame text,                -- 僅 transformation 用
  drills jsonb not null default '[]'::jsonb
);

-- ── 單字(多分類)──
create table vocabulary (
  id bigint generated always as identity primary key,
  word text unique not null,
  native_zh text not null default '',
  categories text[] not null default '{}',  -- 語意分類(可多),對應句框 category
  pos text,
  source text not null default 'seed'       -- seed / ai / user
);

-- ── 詞本:只有名稱(沿用既有表,保留「雅思」9389 字以便搬遷)──
create table if not exists wordbooks (
  name text primary key
);

-- ── 單字 ↔ 詞本:多對多 ──
create table wordbook_vocab (
  wordbook_name text references wordbooks(name) on delete cascade,
  vocab_id bigint references vocabulary(id) on delete cascade,
  primary key (wordbook_name, vocab_id)
);

-- ── 學習進度(取代 kv.progress)──
create table progress (
  lesson_id text not null,
  drill_type text not null,
  updated_at timestamptz not null default now(),
  primary key (lesson_id, drill_type)
);

-- ── 複習 / 歷史(單詞 + 句子 共用)──
create table review_items (
  id bigint generated always as identity primary key,
  kind text not null,                  -- 'word' | 'sentence'
  ref text unique not null,            -- word:water / sent:L_am:I am tired.
  text text not null,
  native_zh text not null default '',
  pattern_id text,
  status text not null default 'new',  -- new / learning / weak / known
  wrong_count int not null default 0,
  marked_unknown_at timestamptz,
  last_wrong_at timestamptz,
  last_seen timestamptz,
  next_review timestamptz,
  interval_days numeric not null default 0,
  ease numeric not null default 2.5
);
create table review_events (
  id bigint generated always as identity primary key,
  item_id bigint references review_items(id) on delete cascade,
  event text not null,                 -- wrong / unknown / correct / seen
  at timestamptz not null default now()
);

-- ── RLS:全部匿名可讀寫(自用)──
do $$
declare t text;
begin
  foreach t in array array['cycles','units','patterns','vocabulary','wordbooks','wordbook_vocab','progress','review_items','review_events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "%s anon all" on %I', t, t);
    execute format('create policy "%s anon all" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;
