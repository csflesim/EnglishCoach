-- v7:把單字記憶 box 鏡像到 vocabulary,方便直接在資料表查看
alter table vocabulary add column if not exists box int not null default 0;
