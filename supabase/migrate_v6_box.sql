-- v6:複習盒子(box / gap),用於艾賓豪斯間隔 + drill 發數遞減
alter table review_items add column if not exists box int not null default 0;
