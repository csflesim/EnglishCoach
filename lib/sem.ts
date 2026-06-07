// 語意子槽 (semantic sub-slots) 正式登錄表。
// 單字的屬性 = pos(詞類)+ count(可數性 c/u,名詞用)+ sem(語意子槽,可多選)+ vi/vt(動詞)。
// 句框宣告要求 = pos + count? + sem[](命中其一即可)。配對見 lib/mock.ts 的選詞函式。

// 顯示用詞類標記(資料庫 pos 仍存小寫 n/v/adj)
export const POS_LABEL: Record<string, string> = {
  n: "n", v: "v", adj: "Adj", adv: "Adv", prep: "prep", conj: "conj", pron: "pron", num: "num", int: "int", art: "art",
};

// 可數性
export const COUNT = ["c", "u"] as const; // c 可數 / u 不可數

// 動詞及物性(沿用既有 slot 名稱以相容)
export const VERB_TRANSITIVITY = ["verb_intrans", "verb_trans"] as const; // v(i) / v(t)

// 語意子槽完整清單(分組)
export const SEM: Record<string, { group: string; tags: { tag: string; zh: string; eg: string }[] }> = {
  noun: {
    group: "名詞 n",
    tags: [
      { tag: "person.job", zh: "職業/職位", eg: "doctor, manager, engineer, nurse" },
      { tag: "person.relation", zh: "關係/社交", eg: "friend, brother, colleague, boss, client" },
      { tag: "person.group", zh: "群體", eg: "team, staff, family, committee" },
      { tag: "person.generic", zh: "泛稱人", eg: "man, woman, child, adult, stranger" },
      { tag: "thing.object", zh: "一般物品", eg: "pen, key, box, bottle, bag" },
      { tag: "thing.device", zh: "電子/器具", eg: "phone, laptop, printer, machine" },
      { tag: "thing.document", zh: "文件票據", eg: "report, invoice, contract, ticket" },
      { tag: "thing.clothing", zh: "衣物", eg: "shirt, shoes, jacket, hat" },
      { tag: "thing.furniture", zh: "家具", eg: "chair, table, desk, bed" },
      { tag: "thing.material", zh: "材料/物質", eg: "wood, metal, plastic, paper" },
      { tag: "place.building", zh: "建築/場所", eg: "office, hospital, hotel, bank, station" },
      { tag: "place.area", zh: "區域", eg: "city, country, street, downtown" },
      { tag: "place.room", zh: "室內空間", eg: "kitchen, lobby, meeting room" },
      { tag: "place.nature", zh: "自然地點", eg: "beach, mountain, park, river" },
      { tag: "food.dish", zh: "食物", eg: "rice, bread, soup, sandwich" },
      { tag: "food.drink", zh: "飲料", eg: "coffee, tea, water, juice" },
      { tag: "food.ingredient", zh: "食材", eg: "sugar, salt, oil, flour" },
      { tag: "transport.vehicle", zh: "交通工具", eg: "bus, train, car, taxi, plane" },
      { tag: "time.point", zh: "時間點", eg: "Monday, January, morning, noon" },
      { tag: "time.period", zh: "時段", eg: "day, week, year, hour, weekend" },
      { tag: "abstract.concept", zh: "概念", eg: "idea, plan, problem, goal, reason" },
      { tag: "abstract.activity", zh: "活動", eg: "meeting, training, project, event, trip" },
      { tag: "abstract.field", zh: "領域", eg: "business, marketing, finance, science" },
      { tag: "abstract.info", zh: "資訊", eg: "information, news, data, advice" },
      { tag: "abstract.money", zh: "金錢", eg: "money, price, salary, budget, fee, tax" },
      { tag: "abstract.quality", zh: "能力/特質", eg: "experience, skill, ability, quality" },
      { tag: "abstract.feeling", zh: "情緒(名詞)", eg: "happiness, stress, fear, pressure" },
      { tag: "body.part", zh: "身體", eg: "hand, head, eye, arm" },
      { tag: "animal", zh: "動物", eg: "dog, cat, bird, fish" },
      { tag: "nature.weather", zh: "天氣", eg: "rain, snow, wind" },
      { tag: "measure.unit", zh: "單位", eg: "meter, kilo, dollar, percent" },
    ],
  },
  adj: {
    group: "形容詞 Adj",
    tags: [
      { tag: "adj.person.trait", zh: "個性", eg: "kind, honest, lazy, smart, brave" },
      { tag: "adj.person.state", zh: "人狀態", eg: "busy, tired, ready, late, sick, free" },
      { tag: "adj.feeling", zh: "情緒", eg: "happy, sad, nervous, excited, worried" },
      { tag: "adj.thing.quality", zh: "評價", eg: "expensive, new, good, important, useful" },
      { tag: "adj.thing.physical", zh: "物理", eg: "big, heavy, hot, cold, fast, hard" },
      { tag: "adj.thing.appearance", zh: "外觀", eg: "beautiful, clean, dirty, bright" },
      { tag: "adj.color", zh: "顏色", eg: "red, blue, yellow" },
      { tag: "adj.shape", zh: "形狀", eg: "round, square, flat" },
      { tag: "adj.material", zh: "材質", eg: "wooden, plastic, metal" },
      { tag: "adj.origin", zh: "國籍/來源", eg: "Canadian, Japanese, local" },
      { tag: "adj.relational", zh: "領域/技術", eg: "financial, medical, legal, digital" },
    ],
  },
  verb: {
    group: "動詞 v",
    tags: [
      { tag: "v.motion", zh: "移動", eg: "go, come, walk, run, leave, arrive" },
      { tag: "v.action", zh: "一般動作", eg: "make, do, use, fix, clean, build" },
      { tag: "v.communication", zh: "溝通", eg: "say, tell, ask, call, email, discuss" },
      { tag: "v.mental", zh: "心理", eg: "think, know, believe, remember, want" },
      { tag: "v.transaction", zh: "交易", eg: "buy, sell, pay, order, book, rent" },
      { tag: "v.possession", zh: "持有", eg: "have, own, get, give, take, keep" },
      { tag: "v.state", zh: "狀態/連綴", eg: "be, seem, become, feel, look, stay" },
    ],
  },
  adv: {
    group: "副詞 Adv",
    tags: [
      { tag: "adv.manner", zh: "方式", eg: "quickly, carefully, well" },
      { tag: "adv.frequency", zh: "頻率", eg: "always, often, sometimes, never" },
      { tag: "adv.time", zh: "時間", eg: "now, soon, today, already" },
      { tag: "adv.place", zh: "地點", eg: "here, there, outside" },
      { tag: "adv.degree", zh: "程度", eg: "very, too, quite, really" },
    ],
  },
};

// 扁平化的合法 sem 標籤集合(分類時驗證用)
export const ALL_SEM_TAGS: string[] = Object.values(SEM).flatMap((g) => g.tags.map((t) => t.tag));
