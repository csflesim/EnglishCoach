-- English Reflex Coach — Supabase schema (MVP)
-- 在 Supabase 專案 → SQL Editor 貼上執行一次。
--
-- 設計:用一張 kv 表存 JSON blob(content / progress),對應前端 localStorage 結構,
--      最小改動即可雲端共享(手機/電腦同步)。日後要正規化再拆表。

create table if not exists kv (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table kv enable row level security;

-- ⚠️ 自用版:允許匿名讀寫(個人工具)。多人使用前請改成 Supabase Auth + 嚴格 policy。
drop policy if exists "kv anon all" on kv;
create policy "kv anon all" on kv for all using (true) with check (true);

-- ── 內容表:把種子(單字 + 句型課)放進資料庫,可在後台「⬆ 上傳種子」一鍵寫入 ──

create table if not exists vocabulary (
  id bigint generated always as identity primary key,
  word text not null,
  native_zh text not null,
  category text not null,
  source text not null default 'seed',
  created_at timestamptz not null default now(),
  unique (word, category)
);
alter table vocabulary enable row level security;
drop policy if exists "vocabulary anon all" on vocabulary;
create policy "vocabulary anon all" on vocabulary for all using (true) with check (true);

create table if not exists patterns (
  id text primary key,
  unit int,
  pattern_text text not null,
  transform_frame text,
  drills jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table patterns enable row level security;
drop policy if exists "patterns anon all" on patterns;
create policy "patterns anon all" on patterns for all using (true) with check (true);

-- 詞本(多本):每本一列,單詞存 words jsonb 陣列
create table if not exists wordbooks (
  name text primary key,
  words jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table wordbooks enable row level security;
drop policy if exists "wordbooks anon all" on wordbooks;
create policy "wordbooks anon all" on wordbooks for all using (true) with check (true);
