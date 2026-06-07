-- v13:AI 生成內容題庫(閱讀短文 / 多益題目)。每次生成都存,之後重用、不浪費額度。
create table if not exists gen_bank (
  id bigint generated always as identity primary key,
  kind text not null,         -- 'reading' | 'toeic'
  level text,                 -- easy / medium / ielts(閱讀)
  topic text,
  tags text[],                -- 多益:[skill]
  payload jsonb not null,     -- reading=整篇 ReadingPassage;toeic=單題 ToeicQuestion
  created_at timestamptz default now()
);
alter table gen_bank enable row level security;
drop policy if exists gen_bank_anon_all on gen_bank;
create policy gen_bank_anon_all on gen_bank for all using (true) with check (true);
create index if not exists idx_gen_bank_kind on gen_bank(kind);
