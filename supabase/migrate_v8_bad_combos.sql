-- v8:封鎖名單 — 某句框配某單字「不通/不自然」,選詞時永久排除
create table if not exists bad_combos (
  frame text not null,   -- 句框模板(如 "{S} {v} ___." 或 "Where is the ___?")
  word text not null,
  reason text,           -- 由 AI 或使用者標記的原因(可空)
  created_at timestamptz not null default now(),
  primary key (frame, word)
);
alter table bad_combos enable row level security;
drop policy if exists "bad_combos anon all" on bad_combos;
create policy "bad_combos anon all" on bad_combos for all using (true) with check (true);
