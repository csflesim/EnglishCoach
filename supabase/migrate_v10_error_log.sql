-- v10:錯誤紀錄表 — 每次 AI 判錯,把錯誤類別逐筆記下,供長期進步分析
create table if not exists error_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null,        -- 單詞 / 文法 / 時態 / 冠詞 / 介係詞 / 字序 / 單複數 / 發音 / 用詞
  expected text,
  said text,
  lesson_id text
);
alter table error_log enable row level security;
drop policy if exists "error_log anon all" on error_log;
create policy "error_log anon all" on error_log for all using (true) with check (true);
create index if not exists error_log_kind_idx on error_log (kind);
create index if not exists error_log_at_idx on error_log (at);
