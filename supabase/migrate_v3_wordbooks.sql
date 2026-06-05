-- v3:詞本改成 catalog(id/name/label)+ vocabulary.wordbooks 陣列;移除 wordbook_vocab
-- 在 SQL Editor 整段執行一次。已分類資料(vocabulary 9389)會保留。

-- 1. vocabulary 加 wordbooks 陣列(成員直接存這裡)
alter table vocabulary add column if not exists wordbooks text[] not null default '{}';

-- 2. 移除舊的 junction
drop table if exists wordbook_vocab cascade;

-- 3. wordbooks 改成 (id, name, label):CELPIP=思培、IELTS=雅思
drop table if exists wordbooks cascade;
create table wordbooks (
  id bigint generated always as identity primary key,
  name text unique not null,
  label text
);
insert into wordbooks (name, label) values ('CELPIP', '思培'), ('IELTS', '雅思');
alter table wordbooks enable row level security;
drop policy if exists "wordbooks anon all" on wordbooks;
create policy "wordbooks anon all" on wordbooks for all using (true) with check (true);
