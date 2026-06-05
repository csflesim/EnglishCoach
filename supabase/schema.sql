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
