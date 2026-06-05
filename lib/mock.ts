// ──────────────────────────────────────────────────────────────────────────
// English Reflex Coach — MVP 資料層（mock）
// 課程「不由 AI 隨機生成」，全部來自：句型庫 + 單字庫 + 學習路徑（受控內容）。
// 之後接真資料時換掉這層即可，UI 不變。
// ──────────────────────────────────────────────────────────────────────────

export type DrillType = "Substitution" | "Transformation" | "Expansion" | "Response";

export const drillTypeZh: Record<DrillType, string> = {
  Substitution: "替換",
  Transformation: "轉換",
  Expansion: "擴展",
  Response: "情境反應",
};

export type Rep = { cue: string; answer: string; nativeZh?: string };

// 替換：漸進句框（結構固定，變數從單字庫依分類抓取）
export type SubFrame = { frame: string; frameZh: string; category: string };
// 轉換：直接拿「替換產生的整批句子」做字串轉換（每操作 = 替換句數，例如 20）
export type TransformOp = {
  op: string;
  instruction: string;
  enFrom: string; // 對替換句做字串替換（英）
  enTo: string;
  zhFrom: string; // 對中文錨點做字串替換
  zhTo: string;
  question?: boolean; // 額外把句尾 . → ?、。 → 嗎？
};

// 擴展：每條鏈 = 基句 + 逐層加長（最多 5 層）。每次抽 5 條，下次換 5 條。
export type ExpLayer = { cue: string; answer: string; nativeZh: string };
export type ExpChain = { base: string; baseZh: string; layers: ExpLayer[] };

export type PatternLesson = {
  id: string;
  patternText: string; // 核心句型
  unit: number;
  substitution: SubFrame[];
  transformation: TransformOp[];
  transformFrame?: string; // 轉換用哪個句框的句子（預設 substitution[0]）
  expansion: ExpChain[]; // 多條擴展鏈，每次抽 5 條
  response: Rep[];
};

// ── 單字庫（替換變數來源；帶分類 + 母語翻譯）──────────────────────
export type VocabWord = { word: string; nativeZh: string; category: string };

export let vocabBank: VocabWord[] = [
  // need_thing —「I need ___.」
  { word: "water", nativeZh: "水", category: "need_thing" },
  { word: "help", nativeZh: "幫忙", category: "need_thing" },
  { word: "a break", nativeZh: "休息一下", category: "need_thing" },
  { word: "more time", nativeZh: "更多時間", category: "need_thing" },
  { word: "a receipt", nativeZh: "收據", category: "need_thing" },
  { word: "a pen", nativeZh: "筆", category: "need_thing" },
  { word: "directions", nativeZh: "方向", category: "need_thing" },
  { word: "an umbrella", nativeZh: "雨傘", category: "need_thing" },
  { word: "a hand", nativeZh: "幫個忙", category: "need_thing" },
  { word: "some advice", nativeZh: "一些建議", category: "need_thing" },
  { word: "a refund", nativeZh: "退款", category: "need_thing" },
  { word: "a charger", nativeZh: "充電器", category: "need_thing" },
  { word: "my keys", nativeZh: "我的鑰匙", category: "need_thing" },
  { word: "a map", nativeZh: "地圖", category: "need_thing" },
  { word: "an appointment", nativeZh: "預約", category: "need_thing" },
  { word: "some rest", nativeZh: "休息", category: "need_thing" },
  { word: "a ride", nativeZh: "搭便車", category: "need_thing" },
  { word: "a password", nativeZh: "密碼", category: "need_thing" },
  { word: "a towel", nativeZh: "毛巾", category: "need_thing" },
  { word: "a blanket", nativeZh: "毯子", category: "need_thing" },
  // need_find —「I need to find ___.」
  { word: "a doctor", nativeZh: "醫生", category: "need_find" },
  { word: "a pharmacy", nativeZh: "藥局", category: "need_find" },
  { word: "the exit", nativeZh: "出口", category: "need_find" },
  { word: "a taxi", nativeZh: "計程車", category: "need_find" },
  { word: "the elevator", nativeZh: "電梯", category: "need_find" },
  { word: "the reception", nativeZh: "櫃台", category: "need_find" },
  { word: "a parking spot", nativeZh: "停車位", category: "need_find" },
  { word: "a bathroom", nativeZh: "廁所", category: "need_find" },
  { word: "an ATM", nativeZh: "提款機", category: "need_find" },
  { word: "the bus stop", nativeZh: "公車站", category: "need_find" },
  { word: "a hotel", nativeZh: "旅館", category: "need_find" },
  { word: "the station", nativeZh: "車站", category: "need_find" },
  { word: "my phone", nativeZh: "我的手機", category: "need_find" },
  { word: "a supermarket", nativeZh: "超市", category: "need_find" },
  { word: "the entrance", nativeZh: "入口", category: "need_find" },
  { word: "a hospital", nativeZh: "醫院", category: "need_find" },
  { word: "a gas station", nativeZh: "加油站", category: "need_find" },
  { word: "the manager", nativeZh: "經理", category: "need_find" },
  { word: "my passport", nativeZh: "我的護照", category: "need_find" },
  { word: "the way out", nativeZh: "出去的路", category: "need_find" },
  // need_buy —「I need to buy ___.」
  { word: "water", nativeZh: "水", category: "need_buy" },
  { word: "a ticket", nativeZh: "票", category: "need_buy" },
  { word: "some medicine", nativeZh: "藥", category: "need_buy" },
  { word: "a SIM card", nativeZh: "SIM 卡", category: "need_buy" },
  { word: "groceries", nativeZh: "雜貨", category: "need_buy" },
  { word: "a coffee", nativeZh: "咖啡", category: "need_buy" },
  { word: "a gift", nativeZh: "禮物", category: "need_buy" },
  { word: "a jacket", nativeZh: "外套", category: "need_buy" },
  { word: "some bread", nativeZh: "麵包", category: "need_buy" },
  { word: "a phone", nativeZh: "手機", category: "need_buy" },
  { word: "a charger", nativeZh: "充電器", category: "need_buy" },
  { word: "stamps", nativeZh: "郵票", category: "need_buy" },
  { word: "a notebook", nativeZh: "筆記本", category: "need_buy" },
  { word: "milk", nativeZh: "牛奶", category: "need_buy" },
  { word: "an umbrella", nativeZh: "雨傘", category: "need_buy" },
  { word: "shoes", nativeZh: "鞋子", category: "need_buy" },
  { word: "a bus pass", nativeZh: "公車票", category: "need_buy" },
  { word: "a winter coat", nativeZh: "冬季外套", category: "need_buy" },
  { word: "some snacks", nativeZh: "零食", category: "need_buy" },
  { word: "a backpack", nativeZh: "背包", category: "need_buy" },
  // need_go —「I need to go to ___.」
  { word: "the bank", nativeZh: "銀行", category: "need_go" },
  { word: "the hospital", nativeZh: "醫院", category: "need_go" },
  { word: "the airport", nativeZh: "機場", category: "need_go" },
  { word: "work", nativeZh: "上班", category: "need_go" },
  { word: "the pharmacy", nativeZh: "藥局", category: "need_go" },
  { word: "the post office", nativeZh: "郵局", category: "need_go" },
  { word: "the grocery store", nativeZh: "雜貨店", category: "need_go" },
  { word: "downtown", nativeZh: "市中心", category: "need_go" },
  { word: "the dentist", nativeZh: "牙醫", category: "need_go" },
  { word: "the gym", nativeZh: "健身房", category: "need_go" },
  { word: "the station", nativeZh: "車站", category: "need_go" },
  { word: "school", nativeZh: "學校", category: "need_go" },
  { word: "the embassy", nativeZh: "大使館", category: "need_go" },
  { word: "a meeting", nativeZh: "開會", category: "need_go" },
  { word: "the washroom", nativeZh: "洗手間", category: "need_go" },
  { word: "the clinic", nativeZh: "診所", category: "need_go" },
  { word: "the mall", nativeZh: "購物中心", category: "need_go" },
  { word: "city hall", nativeZh: "市政府", category: "need_go" },
  { word: "the library", nativeZh: "圖書館", category: "need_go" },
  { word: "the market", nativeZh: "市場", category: "need_go" },
  // need_call —「I need to call ___.」
  { word: "the doctor", nativeZh: "醫生", category: "need_call" },
  { word: "my boss", nativeZh: "我的老闆", category: "need_call" },
  { word: "customer service", nativeZh: "客服", category: "need_call" },
  { word: "the bank", nativeZh: "銀行", category: "need_call" },
  { word: "my mom", nativeZh: "我媽", category: "need_call" },
  { word: "the manager", nativeZh: "經理", category: "need_call" },
  { word: "the landlord", nativeZh: "房東", category: "need_call" },
  { word: "the school", nativeZh: "學校", category: "need_call" },
  { word: "my friend", nativeZh: "我的朋友", category: "need_call" },
  { word: "the office", nativeZh: "辦公室", category: "need_call" },
  { word: "the hospital", nativeZh: "醫院", category: "need_call" },
  { word: "the embassy", nativeZh: "大使館", category: "need_call" },
  { word: "my family", nativeZh: "我的家人", category: "need_call" },
  { word: "the airline", nativeZh: "航空公司", category: "need_call" },
  { word: "the hotel", nativeZh: "旅館", category: "need_call" },
  { word: "my teacher", nativeZh: "我的老師", category: "need_call" },
  { word: "the company", nativeZh: "公司", category: "need_call" },
  { word: "a plumber", nativeZh: "水電工", category: "need_call" },
  { word: "the front desk", nativeZh: "櫃台", category: "need_call" },
  { word: "my lawyer", nativeZh: "我的律師", category: "need_call" },
  // need_see —「I need to see ___.」
  { word: "a doctor", nativeZh: "醫生", category: "need_see" },
  { word: "the menu", nativeZh: "菜單", category: "need_see" },
  { word: "the manager", nativeZh: "經理", category: "need_see" },
  { word: "a dentist", nativeZh: "牙醫", category: "need_see" },
  { word: "my schedule", nativeZh: "我的行程", category: "need_see" },
  { word: "the results", nativeZh: "結果", category: "need_see" },
  { word: "a specialist", nativeZh: "專科醫生", category: "need_see" },
  { word: "the report", nativeZh: "報告", category: "need_see" },
  { word: "the map", nativeZh: "地圖", category: "need_see" },
  { word: "my email", nativeZh: "我的電子郵件", category: "need_see" },
  { word: "the contract", nativeZh: "合約", category: "need_see" },
  { word: "the nurse", nativeZh: "護士", category: "need_see" },
  { word: "the bill", nativeZh: "帳單", category: "need_see" },
  { word: "the photos", nativeZh: "照片", category: "need_see" },
  { word: "my grades", nativeZh: "我的成績", category: "need_see" },
  { word: "the apartment", nativeZh: "公寓", category: "need_see" },
  { word: "the room", nativeZh: "房間", category: "need_see" },
  { word: "the list", nativeZh: "清單", category: "need_see" },
  { word: "the timetable", nativeZh: "時刻表", category: "need_see" },
  { word: "the price", nativeZh: "價格", category: "need_see" },
  // lf —「I am looking for ___.」
  { word: "an apartment", nativeZh: "公寓", category: "lf" },
  { word: "a job", nativeZh: "工作", category: "lf" },
  { word: "a doctor", nativeZh: "醫生", category: "lf" },
  { word: "the washroom", nativeZh: "洗手間", category: "lf" },
  { word: "the bus station", nativeZh: "公車站", category: "lf" },
  { word: "help", nativeZh: "人幫忙", category: "lf" },
  { word: "my keys", nativeZh: "我的鑰匙", category: "lf" },
  { word: "the manager", nativeZh: "經理", category: "lf" },
  { word: "the entrance", nativeZh: "入口", category: "lf" },
  { word: "a parking spot", nativeZh: "停車位", category: "lf" },
  { word: "a pharmacy", nativeZh: "藥局", category: "lf" },
  { word: "the exit", nativeZh: "出口", category: "lf" },
  { word: "my phone", nativeZh: "我的手機", category: "lf" },
  { word: "a supermarket", nativeZh: "超市", category: "lf" },
  { word: "the elevator", nativeZh: "電梯", category: "lf" },
  { word: "an ATM", nativeZh: "提款機", category: "lf" },
  { word: "the reception", nativeZh: "櫃台", category: "lf" },
  { word: "a hotel", nativeZh: "旅館", category: "lf" },
  { word: "my passport", nativeZh: "我的護照", category: "lf" },
  { word: "a taxi", nativeZh: "計程車", category: "lf" },
  // cheap_noun —「I am looking for a cheap ___.」
  { word: "apartment", nativeZh: "公寓", category: "cheap_noun" },
  { word: "hotel", nativeZh: "旅館", category: "cheap_noun" },
  { word: "ticket", nativeZh: "票", category: "cheap_noun" },
  { word: "phone", nativeZh: "手機", category: "cheap_noun" },
  { word: "car", nativeZh: "車", category: "cheap_noun" },
  { word: "laptop", nativeZh: "筆電", category: "cheap_noun" },
  { word: "flight", nativeZh: "機票", category: "cheap_noun" },
  { word: "restaurant", nativeZh: "餐廳", category: "cheap_noun" },
  { word: "gym", nativeZh: "健身房", category: "cheap_noun" },
  { word: "haircut", nativeZh: "剪髮", category: "cheap_noun" },
  { word: "room", nativeZh: "房間", category: "cheap_noun" },
  { word: "bike", nativeZh: "腳踏車", category: "cheap_noun" },
  { word: "jacket", nativeZh: "外套", category: "cheap_noun" },
  { word: "watch", nativeZh: "手錶", category: "cheap_noun" },
  { word: "sofa", nativeZh: "沙發", category: "cheap_noun" },
  { word: "fridge", nativeZh: "冰箱", category: "cheap_noun" },
  { word: "mattress", nativeZh: "床墊", category: "cheap_noun" },
  { word: "printer", nativeZh: "印表機", category: "cheap_noun" },
  { word: "monitor", nativeZh: "螢幕", category: "cheap_noun" },
  { word: "backpack", nativeZh: "背包", category: "cheap_noun" },
  // good_noun —「I am looking for a good ___.」
  { word: "doctor", nativeZh: "醫生", category: "good_noun" },
  { word: "school", nativeZh: "學校", category: "good_noun" },
  { word: "restaurant", nativeZh: "餐廳", category: "good_noun" },
  { word: "dentist", nativeZh: "牙醫", category: "good_noun" },
  { word: "lawyer", nativeZh: "律師", category: "good_noun" },
  { word: "mechanic", nativeZh: "技師", category: "good_noun" },
  { word: "plumber", nativeZh: "水電工", category: "good_noun" },
  { word: "teacher", nativeZh: "老師", category: "good_noun" },
  { word: "hairdresser", nativeZh: "髮型師", category: "good_noun" },
  { word: "babysitter", nativeZh: "保母", category: "good_noun" },
  { word: "accountant", nativeZh: "會計師", category: "good_noun" },
  { word: "agent", nativeZh: "仲介", category: "good_noun" },
  { word: "gym", nativeZh: "健身房", category: "good_noun" },
  { word: "cafe", nativeZh: "咖啡廳", category: "good_noun" },
  { word: "hotel", nativeZh: "旅館", category: "good_noun" },
  { word: "tutor", nativeZh: "家教", category: "good_noun" },
  { word: "university", nativeZh: "大學", category: "good_noun" },
  { word: "hospital", nativeZh: "醫院", category: "good_noun" },
  { word: "barber", nativeZh: "理髮師", category: "good_noun" },
  { word: "clinic", nativeZh: "診所", category: "good_noun" },
  // be_adj —「I am ___.」(可加「很/不/你…嗎」的形容詞)
  { word: "tired", nativeZh: "累", category: "be_adj" },
  { word: "hungry", nativeZh: "餓", category: "be_adj" },
  { word: "thirsty", nativeZh: "渴", category: "be_adj" },
  { word: "busy", nativeZh: "忙", category: "be_adj" },
  { word: "cold", nativeZh: "冷", category: "be_adj" },
  { word: "hot", nativeZh: "熱", category: "be_adj" },
  { word: "sleepy", nativeZh: "睏", category: "be_adj" },
  { word: "happy", nativeZh: "開心", category: "be_adj" },
  { word: "sad", nativeZh: "難過", category: "be_adj" },
  { word: "nervous", nativeZh: "緊張", category: "be_adj" },
  { word: "scared", nativeZh: "害怕", category: "be_adj" },
  { word: "excited", nativeZh: "興奮", category: "be_adj" },
  { word: "angry", nativeZh: "生氣", category: "be_adj" },
  { word: "bored", nativeZh: "無聊", category: "be_adj" },
  { word: "full", nativeZh: "飽", category: "be_adj" },
  { word: "lonely", nativeZh: "孤單", category: "be_adj" },
  { word: "lucky", nativeZh: "幸運", category: "be_adj" },
  { word: "proud", nativeZh: "驕傲", category: "be_adj" },
  { word: "worried", nativeZh: "擔心", category: "be_adj" },
  { word: "calm", nativeZh: "冷靜", category: "be_adj" },
  // be_role —「I am a ___.」(身分/角色)
  { word: "a student", nativeZh: "學生", category: "be_role" },
  { word: "a teacher", nativeZh: "老師", category: "be_role" },
  { word: "a doctor", nativeZh: "醫生", category: "be_role" },
  { word: "a nurse", nativeZh: "護士", category: "be_role" },
  { word: "a driver", nativeZh: "司機", category: "be_role" },
  { word: "a cook", nativeZh: "廚師", category: "be_role" },
  { word: "a beginner", nativeZh: "初學者", category: "be_role" },
  { word: "a tourist", nativeZh: "觀光客", category: "be_role" },
  { word: "a customer", nativeZh: "顧客", category: "be_role" },
  { word: "a parent", nativeZh: "家長", category: "be_role" },
  { word: "a manager", nativeZh: "經理", category: "be_role" },
  { word: "an engineer", nativeZh: "工程師", category: "be_role" },
  { word: "a designer", nativeZh: "設計師", category: "be_role" },
  { word: "a writer", nativeZh: "作家", category: "be_role" },
  { word: "a volunteer", nativeZh: "志工", category: "be_role" },
  { word: "a newcomer", nativeZh: "新移民", category: "be_role" },
  { word: "a freelancer", nativeZh: "自由工作者", category: "be_role" },
  { word: "a member", nativeZh: "會員", category: "be_role" },
  { word: "a guest", nativeZh: "客人", category: "be_role" },
  { word: "a fan", nativeZh: "粉絲", category: "be_role" },
  // be_from —「I am from ___.」(來自)
  { word: "Taiwan", nativeZh: "台灣", category: "be_from" },
  { word: "Canada", nativeZh: "加拿大", category: "be_from" },
  { word: "Japan", nativeZh: "日本", category: "be_from" },
  { word: "the US", nativeZh: "美國", category: "be_from" },
  { word: "Taipei", nativeZh: "台北", category: "be_from" },
  { word: "a small town", nativeZh: "小鎮", category: "be_from" },
  { word: "overseas", nativeZh: "海外", category: "be_from" },
  { word: "the Philippines", nativeZh: "菲律賓", category: "be_from" },
  { word: "Korea", nativeZh: "韓國", category: "be_from" },
  { word: "China", nativeZh: "中國", category: "be_from" },
  { word: "Hong Kong", nativeZh: "香港", category: "be_from" },
  { word: "Vietnam", nativeZh: "越南", category: "be_from" },
  { word: "India", nativeZh: "印度", category: "be_from" },
  { word: "Mexico", nativeZh: "墨西哥", category: "be_from" },
  { word: "Brazil", nativeZh: "巴西", category: "be_from" },
  { word: "the UK", nativeZh: "英國", category: "be_from" },
  { word: "Australia", nativeZh: "澳洲", category: "be_from" },
  { word: "France", nativeZh: "法國", category: "be_from" },
  { word: "Germany", nativeZh: "德國", category: "be_from" },
  { word: "another country", nativeZh: "另一個國家", category: "be_from" },
  // be_at —「I am at ___.」(在某地)
  { word: "home", nativeZh: "家", category: "be_at" },
  { word: "work", nativeZh: "公司", category: "be_at" },
  { word: "school", nativeZh: "學校", category: "be_at" },
  { word: "the office", nativeZh: "辦公室", category: "be_at" },
  { word: "the airport", nativeZh: "機場", category: "be_at" },
  { word: "the station", nativeZh: "車站", category: "be_at" },
  { word: "the hospital", nativeZh: "醫院", category: "be_at" },
  { word: "the bank", nativeZh: "銀行", category: "be_at" },
  { word: "the gym", nativeZh: "健身房", category: "be_at" },
  { word: "the library", nativeZh: "圖書館", category: "be_at" },
  { word: "the mall", nativeZh: "購物中心", category: "be_at" },
  { word: "a meeting", nativeZh: "開會中", category: "be_at" },
  { word: "the bus stop", nativeZh: "公車站", category: "be_at" },
  { word: "the restaurant", nativeZh: "餐廳", category: "be_at" },
  { word: "the hotel", nativeZh: "旅館", category: "be_at" },
  { word: "downtown", nativeZh: "市中心", category: "be_at" },
  { word: "the park", nativeZh: "公園", category: "be_at" },
  { word: "the clinic", nativeZh: "診所", category: "be_at" },
  { word: "the supermarket", nativeZh: "超市", category: "be_at" },
  { word: "the coffee shop", nativeZh: "咖啡廳", category: "be_at" },
  // be_purpose —「I am here to ___.」(來這裡做…)
  { word: "to study", nativeZh: "讀書", category: "be_purpose" },
  { word: "to work", nativeZh: "工作", category: "be_purpose" },
  { word: "to visit family", nativeZh: "探親", category: "be_purpose" },
  { word: "to learn English", nativeZh: "學英文", category: "be_purpose" },
  { word: "to travel", nativeZh: "旅遊", category: "be_purpose" },
  { word: "to see a doctor", nativeZh: "看醫生", category: "be_purpose" },
  { word: "to apply for a visa", nativeZh: "申請簽證", category: "be_purpose" },
  { word: "to meet a friend", nativeZh: "見朋友", category: "be_purpose" },
  { word: "to find a job", nativeZh: "找工作", category: "be_purpose" },
  { word: "to take a class", nativeZh: "上課", category: "be_purpose" },
  { word: "to attend a meeting", nativeZh: "開會", category: "be_purpose" },
  { word: "to pick up a friend", nativeZh: "接朋友", category: "be_purpose" },
  { word: "to buy a ticket", nativeZh: "買票", category: "be_purpose" },
  { word: "to ask a question", nativeZh: "問問題", category: "be_purpose" },
  { word: "to open an account", nativeZh: "開戶", category: "be_purpose" },
  { word: "to get some help", nativeZh: "尋求協助", category: "be_purpose" },
  // place —「Where is ___?」/「I can't find ___.」(地點，含冠詞)
  { word: "the bank", nativeZh: "銀行", category: "place" },
  { word: "the station", nativeZh: "車站", category: "place" },
  { word: "the airport", nativeZh: "機場", category: "place" },
  { word: "the washroom", nativeZh: "洗手間", category: "place" },
  { word: "the exit", nativeZh: "出口", category: "place" },
  { word: "the elevator", nativeZh: "電梯", category: "place" },
  { word: "the pharmacy", nativeZh: "藥局", category: "place" },
  { word: "the hospital", nativeZh: "醫院", category: "place" },
  { word: "the bus stop", nativeZh: "公車站", category: "place" },
  { word: "the ATM", nativeZh: "提款機", category: "place" },
  { word: "the entrance", nativeZh: "入口", category: "place" },
  { word: "the reception", nativeZh: "櫃台", category: "place" },
  { word: "the parking lot", nativeZh: "停車場", category: "place" },
  { word: "the post office", nativeZh: "郵局", category: "place" },
  { word: "the supermarket", nativeZh: "超市", category: "place" },
  { word: "the taxi stand", nativeZh: "計程車招呼站", category: "place" },
  { word: "the information desk", nativeZh: "服務台", category: "place" },
  { word: "the gate", nativeZh: "登機門", category: "place" },
  { word: "the front desk", nativeZh: "前台", category: "place" },
  { word: "the food court", nativeZh: "美食街", category: "place" },
  // my_things —「This is my ___.」/「Where is my ___?」(個人物品，裸名詞)
  { word: "phone", nativeZh: "手機", category: "my_things" },
  { word: "key", nativeZh: "鑰匙", category: "my_things" },
  { word: "bag", nativeZh: "包包", category: "my_things" },
  { word: "passport", nativeZh: "護照", category: "my_things" },
  { word: "ticket", nativeZh: "票", category: "my_things" },
  { word: "seat", nativeZh: "座位", category: "my_things" },
  { word: "room", nativeZh: "房間", category: "my_things" },
  { word: "car", nativeZh: "車", category: "my_things" },
  { word: "wallet", nativeZh: "錢包", category: "my_things" },
  { word: "umbrella", nativeZh: "雨傘", category: "my_things" },
  { word: "charger", nativeZh: "充電器", category: "my_things" },
  { word: "laptop", nativeZh: "筆電", category: "my_things" },
  { word: "notebook", nativeZh: "筆記本", category: "my_things" },
  { word: "bike", nativeZh: "腳踏車", category: "my_things" },
  { word: "jacket", nativeZh: "外套", category: "my_things" },
  { word: "watch", nativeZh: "手錶", category: "my_things" },
  { word: "suitcase", nativeZh: "行李箱", category: "my_things" },
  { word: "address", nativeZh: "地址", category: "my_things" },
  { word: "number", nativeZh: "號碼", category: "my_things" },
  { word: "name", nativeZh: "名字", category: "my_things" },
];

// ── 執行期內容覆蓋層（後台新增的句框；由 content.ts 注入並存資料庫/localStorage）──
const extraFrames: Record<string, SubFrame[]> = {};

export function vocabByCategory(category: string) {
  return vocabBank.filter((v) => v.category === category);
}
export function vocabCategories(): string[] {
  return Array.from(new Set(vocabBank.map((v) => v.category))).sort();
}

// 一課的所有句框 = 種子(substitution) + 後台新增(extraFrames)
export function framesOf(lesson: PatternLesson): SubFrame[] {
  return lesson.substitution.concat(extraFrames[lesson.id] ?? []);
}
export function addFrameRuntime(lessonId: string, f: SubFrame) {
  extraFrames[lessonId] = (extraFrames[lessonId] ?? []).concat([f]);
}
export function removeFrameRuntime(lessonId: string, frame: string) {
  extraFrames[lessonId] = (extraFrames[lessonId] ?? []).filter((x) => x.frame !== frame);
}
export function isExtraFrame(lessonId: string, frame: string) {
  return (extraFrames[lessonId] ?? []).some((x) => x.frame === frame);
}

// ── 句型課（示範 2 課）────────────────────────────────────────────
export let lessons: PatternLesson[] = [
  {
    id: "L_am",
    patternText: "I am ___.",
    unit: 1,
    substitution: [
      { frame: "I am ___.", frameZh: "我很 ___。", category: "be_adj" },
      { frame: "I am a ___.", frameZh: "我是 ___。", category: "be_role" },
      { frame: "I am from ___.", frameZh: "我來自 ___。", category: "be_from" },
      { frame: "I am at ___.", frameZh: "我在 ___。", category: "be_at" },
      { frame: "I am here ___.", frameZh: "我來這裡 ___。", category: "be_purpose" },
    ],
    transformation: [
      { op: "past", instruction: "改成過去式 (→ Past)", enFrom: "I am", enTo: "I was", zhFrom: "我很", zhTo: "我（剛才）很" },
      { op: "negative", instruction: "改成否定 (→ Negative)", enFrom: "I am", enTo: "I am not", zhFrom: "我很", zhTo: "我不" },
      { op: "question", instruction: "改成疑問 (→ Question)", enFrom: "I am", enTo: "Are you", zhFrom: "我很", zhTo: "你", question: true },
    ],
    expansion: [
      {
        base: "I am tired.", baseZh: "我很累。", layers: [
          { cue: "+ today", answer: "I am tired today.", nativeZh: "我今天很累。" },
          { cue: "+ because I worked late", answer: "I am tired today because I worked late.", nativeZh: "我今天很累，因為我工作到很晚。" },
        ]
      },
      {
        base: "I am a student.", baseZh: "我是學生。", layers: [
          { cue: "+ at the college", answer: "I am a student at the college.", nativeZh: "我是這所學院的學生。" },
          { cue: "+ in my second year", answer: "I am a student at the college in my second year.", nativeZh: "我是這所學院二年級的學生。" },
        ]
      },
      {
        base: "I am from Taiwan.", baseZh: "我來自台灣。", layers: [
          { cue: "+ originally", answer: "I am originally from Taiwan.", nativeZh: "我原本來自台灣。" },
          { cue: "+ but I live here now", answer: "I am originally from Taiwan, but I live here now.", nativeZh: "我原本來自台灣，但現在住在這裡。" },
        ]
      },
      {
        base: "I am here to study.", baseZh: "我來這裡讀書。", layers: [
          { cue: "+ English", answer: "I am here to study English.", nativeZh: "我來這裡學英文。" },
          { cue: "+ for my career", answer: "I am here to study English for my career.", nativeZh: "我來這裡為了職涯學英文。" },
        ]
      },
      {
        base: "I am at work.", baseZh: "我在公司。", layers: [
          { cue: "+ right now", answer: "I am at work right now.", nativeZh: "我現在在公司。" },
          { cue: "+ until six", answer: "I am at work right now until six.", nativeZh: "我現在在公司，要到六點。" },
        ]
      },
      {
        base: "I am hungry.", baseZh: "我很餓。", layers: [
          { cue: "+ a little", answer: "I am a little hungry.", nativeZh: "我有點餓。" },
          { cue: "+ let's eat", answer: "I am a little hungry, let's eat.", nativeZh: "我有點餓，我們去吃吧。" },
        ]
      },
    ],
    response: [],
  },
  {
    id: "L_looking_for",
    patternText: "I am looking for ___.",
    unit: 15,
    substitution: [
      { frame: "I am looking for ___.", frameZh: "我在找 ___。", category: "lf" },
      { frame: "I am looking for a cheap ___.", frameZh: "我在找便宜的 ___。", category: "cheap_noun" },
      { frame: "I am looking for a good ___.", frameZh: "我在找好的 ___。", category: "good_noun" },
    ],
    transformation: [
      { op: "past", instruction: "改成過去式 (→ Past)", enFrom: "I am looking for", enTo: "I was looking for", zhFrom: "我在找", zhTo: "我（剛才）在找" },
      { op: "negative", instruction: "改成否定 (→ Negative)", enFrom: "I am looking for", enTo: "I am not looking for", zhFrom: "我在找", zhTo: "我沒有在找" },
      { op: "question", instruction: "改成疑問 (→ Question)", enFrom: "I am looking for", enTo: "Are you looking for", zhFrom: "我在找", zhTo: "你在找", question: true },
    ],
    expansion: [
      {
        base: "I am looking for an apartment.", baseZh: "我在找公寓。", layers: [
          { cue: "+ downtown", answer: "I am looking for an apartment downtown.", nativeZh: "我在找市中心的公寓。" },
          { cue: "+ near my office", answer: "I am looking for an apartment downtown near my office.", nativeZh: "我在找公司附近、市中心的公寓。" },
        ]
      },
      {
        base: "I am looking for a job.", baseZh: "我在找工作。", layers: [
          { cue: "+ part-time", answer: "I am looking for a part-time job.", nativeZh: "我在找兼職工作。" },
          { cue: "+ downtown", answer: "I am looking for a part-time job downtown.", nativeZh: "我在找市中心的兼職工作。" },
        ]
      },
      {
        base: "I am looking for a doctor.", baseZh: "我在找醫生。", layers: [
          { cue: "+ a good", answer: "I am looking for a good doctor.", nativeZh: "我在找好醫生。" },
          { cue: "+ near my home", answer: "I am looking for a good doctor near my home.", nativeZh: "我在找住家附近的好醫生。" },
        ]
      },
      {
        base: "I am looking for the bus station.", baseZh: "我在找公車站。", layers: [
          { cue: "+ on this street", answer: "I am looking for the bus station on this street.", nativeZh: "我在找這條街上的公車站。" },
        ]
      },
      {
        base: "I am looking for help.", baseZh: "我在找人幫忙。", layers: [
          { cue: "+ with my luggage", answer: "I am looking for help with my luggage.", nativeZh: "我在找人幫忙提行李。" },
          { cue: "+ right now", answer: "I am looking for help with my luggage right now.", nativeZh: "我現在就在找人幫忙提行李。" },
        ]
      },
      {
        base: "I am looking for a pharmacy.", baseZh: "我在找藥局。", layers: [
          { cue: "+ nearby", answer: "I am looking for a pharmacy nearby.", nativeZh: "我在找附近的藥局。" },
          { cue: "+ that is open", answer: "I am looking for a pharmacy nearby that is open.", nativeZh: "我在找附近還開著的藥局。" },
        ]
      },
    ],
    response: [
      { cue: "Why are you looking for an apartment?", answer: "Because my lease is ending soon.", nativeZh: "因為我的租約快到期了。" },
      { cue: "What kind of apartment do you want?", answer: "I want a one-bedroom near downtown.", nativeZh: "我想要市中心附近的一房。" },
      { cue: "How much can you pay?", answer: "I can pay around twelve hundred a month.", nativeZh: "我每個月大約能付一千二。" },
    ],
  },
  {
    id: "L_need",
    patternText: "I need ___.",
    unit: 6,
    substitution: [
      { frame: "I need ___.", frameZh: "我需要 ___。", category: "need_thing" },
      { frame: "I need to find ___.", frameZh: "我需要找 ___。", category: "need_find" },
      { frame: "I need to buy ___.", frameZh: "我需要買 ___。", category: "need_buy" },
      { frame: "I need to go to ___.", frameZh: "我需要去 ___。", category: "need_go" },
      { frame: "I need to call ___.", frameZh: "我需要打電話給 ___。", category: "need_call" },
      { frame: "I need to see ___.", frameZh: "我需要看 ___。", category: "need_see" },
    ],
    transformation: [
      { op: "past", instruction: "改成過去式 (→ Past)", enFrom: "I need", enTo: "I needed", zhFrom: "我需要", zhTo: "我（剛才）需要" },
      { op: "negative", instruction: "改成否定 (→ Negative)", enFrom: "I need", enTo: "I don't need", zhFrom: "我需要", zhTo: "我不需要" },
      { op: "question", instruction: "改成疑問 (→ Question)", enFrom: "I need", enTo: "Do you need", zhFrom: "我需要", zhTo: "你需要", question: true },
    ],
    expansion: [
      {
        base: "I need help.", baseZh: "我需要幫忙。", layers: [
          { cue: "+ with this form", answer: "I need help with this form.", nativeZh: "我需要幫忙填這張表。" },
          { cue: "+ please", answer: "I need help with this form, please.", nativeZh: "請幫我填一下這張表。" },
        ]
      },
      {
        base: "I need a doctor.", baseZh: "我需要醫生。", layers: [
          { cue: "+ right now", answer: "I need a doctor right now.", nativeZh: "我現在就需要醫生。" },
          { cue: "+ who speaks Chinese", answer: "I need a doctor who speaks Chinese right now.", nativeZh: "我現在需要一位會說中文的醫生。" },
        ]
      },
      {
        base: "I need a taxi.", baseZh: "我需要計程車。", layers: [
          { cue: "+ to the airport", answer: "I need a taxi to the airport.", nativeZh: "我需要去機場的計程車。" },
          { cue: "+ in ten minutes", answer: "I need a taxi to the airport in ten minutes.", nativeZh: "我需要十分鐘內到機場的計程車。" },
        ]
      },
      {
        base: "I need water.", baseZh: "我需要水。", layers: [
          { cue: "+ please", answer: "I need water, please.", nativeZh: "請給我水。" },
          { cue: "+ and a menu", answer: "I need water and a menu, please.", nativeZh: "請給我水和菜單。" },
        ]
      },
      {
        base: "I need more time.", baseZh: "我需要更多時間。", layers: [
          { cue: "+ to finish", answer: "I need more time to finish.", nativeZh: "我需要更多時間完成。" },
          { cue: "+ this report", answer: "I need more time to finish this report.", nativeZh: "我需要更多時間完成這份報告。" },
        ]
      },
      {
        base: "I need a receipt.", baseZh: "我需要收據。", layers: [
          { cue: "+ for this", answer: "I need a receipt for this.", nativeZh: "我需要這個的收據。" },
          { cue: "+ for my taxes", answer: "I need a receipt for this for my taxes.", nativeZh: "我需要這個的收據，報稅用。" },
        ]
      },
    ],
    response: [
      { cue: "What do you need?", answer: "I need to see a doctor.", nativeZh: "我需要看醫生。" },
      { cue: "Do you need anything else?", answer: "No, that's all, thank you.", nativeZh: "不用了，就這些，謝謝。" },
    ],
  },
  // ── Unit 2 社交確認：Are you ___? ──
  {
    id: "L_are",
    patternText: "Are you ___?",
    unit: 2,
    substitution: [
      { frame: "Are you ___?", frameZh: "你 ___ 嗎？", category: "be_adj" },
      { frame: "Are you a ___?", frameZh: "你是 ___ 嗎？", category: "be_role" },
      { frame: "Are you from ___?", frameZh: "你來自 ___ 嗎？", category: "be_from" },
    ],
    transformation: [],
    expansion: [
      {
        base: "Are you ready?", baseZh: "你準備好了嗎？", layers: [
          { cue: "+ to go", answer: "Are you ready to go?", nativeZh: "你準備好要走了嗎？" },
          { cue: "+ now", answer: "Are you ready to go now?", nativeZh: "你現在準備好要走了嗎？" },
        ]
      },
      {
        base: "Are you a student?", baseZh: "你是學生嗎？", layers: [
          { cue: "+ here", answer: "Are you a student here?", nativeZh: "你是這裡的學生嗎？" },
        ]
      },
      {
        base: "Are you free?", baseZh: "你有空嗎？", layers: [
          { cue: "+ tonight", answer: "Are you free tonight?", nativeZh: "你今晚有空嗎？" },
          { cue: "+ for dinner", answer: "Are you free tonight for dinner?", nativeZh: "你今晚有空吃晚餐嗎？" },
        ]
      },
    ],
    response: [],
  },
  // ── Unit 3 空間定位：Where is ___? ──
  {
    id: "L_where",
    patternText: "Where is ___?",
    unit: 3,
    substitution: [
      { frame: "Where is ___?", frameZh: "___ 在哪裡？", category: "place" },
      { frame: "I can't find ___.", frameZh: "我找不到 ___。", category: "place" },
    ],
    transformation: [],
    expansion: [
      {
        base: "Where is the washroom?", baseZh: "洗手間在哪裡？", layers: [
          { cue: "+ please", answer: "Where is the washroom, please?", nativeZh: "請問洗手間在哪裡？" },
        ]
      },
      {
        base: "Where is the station?", baseZh: "車站在哪裡？", layers: [
          { cue: "+ nearest", answer: "Where is the nearest station?", nativeZh: "最近的車站在哪裡？" },
        ]
      },
      {
        base: "I can't find the exit.", baseZh: "我找不到出口。", layers: [
          { cue: "+ can you help", answer: "I can't find the exit. Can you help me?", nativeZh: "我找不到出口，可以幫我嗎？" },
        ]
      },
    ],
    response: [],
  },
  // ── Unit 4 數量感知：I have ___. ──
  {
    id: "L_have",
    patternText: "I have ___.",
    unit: 4,
    substitution: [
      { frame: "I have ___.", frameZh: "我有 ___。", category: "need_buy" },
      { frame: "I don't have ___.", frameZh: "我沒有 ___。", category: "need_buy" },
      { frame: "Do you have ___?", frameZh: "你有 ___ 嗎？", category: "need_buy" },
    ],
    transformation: [],
    expansion: [
      {
        base: "I have a ticket.", baseZh: "我有票。", layers: [
          { cue: "+ for tonight", answer: "I have a ticket for tonight.", nativeZh: "我有今晚的票。" },
        ]
      },
      {
        base: "I don't have a charger.", baseZh: "我沒有充電器。", layers: [
          { cue: "+ with me", answer: "I don't have a charger with me.", nativeZh: "我身上沒帶充電器。" },
        ]
      },
      {
        base: "Do you have water?", baseZh: "你有水嗎？", layers: [
          { cue: "+ cold", answer: "Do you have cold water?", nativeZh: "你有冰水嗎？" },
        ]
      },
    ],
    response: [],
  },
  // ── Unit 5 所屬關係：This is my ___. ──
  {
    id: "L_my",
    patternText: "This is my ___.",
    unit: 5,
    substitution: [
      { frame: "This is my ___.", frameZh: "這是我的 ___。", category: "my_things" },
      { frame: "Where is my ___?", frameZh: "我的 ___ 在哪裡？", category: "my_things" },
      { frame: "I lost my ___.", frameZh: "我弄丟了我的 ___。", category: "my_things" },
    ],
    transformation: [],
    expansion: [
      {
        base: "This is my passport.", baseZh: "這是我的護照。", layers: [
          { cue: "+ and my visa", answer: "This is my passport and my visa.", nativeZh: "這是我的護照和簽證。" },
        ]
      },
      {
        base: "Where is my phone?", baseZh: "我的手機在哪裡？", layers: [
          { cue: "+ I just had it", answer: "Where is my phone? I just had it.", nativeZh: "我的手機在哪裡？我剛剛還拿著。" },
        ]
      },
      {
        base: "I lost my wallet.", baseZh: "我弄丟了錢包。", layers: [
          { cue: "+ on the bus", answer: "I lost my wallet on the bus.", nativeZh: "我把錢包掉在公車上了。" },
        ]
      },
    ],
    response: [],
  },
];

export function getLesson(id: string) {
  return lessons.find((l) => l.id === id) ?? lessons[0];
}

// ── 單一模式的操練序列（四式分開；含分組過場資訊）──────────────────
export type Step = {
  type: DrillType;
  cue: string;
  answer: string;
  nativeZh?: string;
  groupKey?: string; // 分組邊界（句框 / 操作）
  groupTitle?: string; // 過場顯示（句框英文 / 操作指令）
  groupSpeak?: string; // 過場 TTS（句框英文；轉換不播）
};

export const SUBSTITUTION_TARGET = 20; // 替換正常 20 發（湊不齊則用現有）

// key：替換時指定句框(frame)、轉換時指定操作(op)；frameKey：轉換時指定要變換哪個句框
export function buildSession(lesson: PatternLesson, type: DrillType, key?: string, frameKey?: string): Step[] {
  if (type === "Substitution") {
    const all = framesOf(lesson);
    const frames = key ? all.filter((f) => f.frame === key) : all;
    const steps: Step[] = [];
    for (const f of frames) {
      for (const w of vocabByCategory(f.category)) {
        steps.push({
          type,
          cue: w.word,
          answer: f.frame.replace("___", w.word),
          nativeZh: f.frameZh.replace("___", w.nativeZh),
          groupKey: f.frame,
          groupTitle: f.frame,
          // 不播 groupSpeak：句框含 ___，避免 TTS 唸出「underscore」
        });
      }
    }
    return key ? steps : steps.slice(0, SUBSTITUTION_TARGET);
  }
  if (type === "Transformation") {
    // 轉換用「最原始的句框」(substitution[0]) 的句子來變換
    const bases = transformBases(lesson, frameKey);
    const ops = key ? lesson.transformation.filter((o) => o.op === key) : lesson.transformation;
    const steps: Step[] = [];
    for (const o of ops) {
      for (const b of bases) {
        steps.push({ type, ...applyTransform(o, b.answer, b.nativeZh), groupKey: o.op, groupTitle: o.instruction });
      }
    }
    return steps;
  }
  if (type === "Expansion") {
    // 每次抽 5 條，下次換另外 5 條（輪替）。每條 = 基句(過場) + 逐層加長。
    const chains = pickExpansionChains(lesson.expansion);
    const steps: Step[] = [];
    for (const c of chains) {
      for (const l of c.layers) {
        steps.push({ type, cue: l.cue, answer: l.answer, nativeZh: l.nativeZh, groupKey: c.base, groupTitle: c.base, groupSpeak: c.base });
      }
    }
    return steps;
  }
  return lesson.response.map((r) => ({ type, cue: r.cue, answer: r.answer, nativeZh: r.nativeZh }));
}

// 轉換的基準句：依指定句框(frameKey)，否則 transformFrame，否則 substitution[0]
function transformBases(lesson: PatternLesson, frameKey?: string): { answer: string; nativeZh: string }[] {
  const fr = framesOf(lesson);
  const f =
    fr.find((s) => s.frame === frameKey) ??
    fr.find((s) => s.frame === lesson.transformFrame) ??
    fr[0];
  if (!f) return [];
  return vocabByCategory(f.category).map((w) => ({
    answer: f.frame.replace("___", w.word),
    nativeZh: f.frameZh.replace("___", w.nativeZh),
  }));
}

// 套用一個轉換操作到一句（英 + 中錨點）
function applyTransform(o: TransformOp, en: string, zh: string) {
  let cue = en;
  let answer = en.replace(o.enFrom, o.enTo);
  let nativeZh = zh.replace(o.zhFrom, o.zhTo);
  if (o.question) {
    answer = answer.replace(/\.$/, "?");
    nativeZh = nativeZh.replace(/。$/, "嗎？");
  }
  return { cue, answer, nativeZh };
}

export const EXPANSION_PICK = 5; // 每次抽 5 條
let expansionOffset = 0; // 輪替起點，下次換另外 5 條
function pickExpansionChains(chains: ExpChain[]): ExpChain[] {
  const n = chains.length;
  if (n === 0) return [];
  const out: ExpChain[] = [];
  for (let i = 0; i < Math.min(EXPANSION_PICK, n); i++) out.push(chains[(expansionOffset + i) % n]);
  expansionOffset = (expansionOffset + EXPANSION_PICK) % n;
  return out;
}

export function modeCount(lesson: PatternLesson, type: DrillType) {
  if (type === "Transformation") return transformBases(lesson).length * lesson.transformation.length;
  return buildSession(lesson, type).length;
}

// 一課實際有內容的模式（情境反應已關閉，不計入）
export function availableModes(lesson: PatternLesson): DrillType[] {
  const m: DrillType[] = [];
  if (lesson.substitution.length) m.push("Substitution");
  if (lesson.transformation.length) m.push("Transformation");
  if (lesson.expansion.length) m.push("Expansion");
  return m;
}

// 替換句框的發數（供第二層選單顯示）
export function subFrameCount(f: SubFrame) {
  return vocabByCategory(f.category).length;
}

// 轉換操作的發數與示範（供選單顯示）— 可指定句框
export function transformOpCount(lesson: PatternLesson, frameKey?: string) {
  return transformBases(lesson, frameKey).length;
}
export function transformExample(lesson: PatternLesson, op: TransformOp, frameKey?: string) {
  const base = transformBases(lesson, frameKey)[0];
  if (!base) return { cue: "", answer: "" };
  const r = applyTransform(op, base.answer, base.nativeZh);
  return { cue: r.cue, answer: r.answer };
}

// ── 學習路徑：FSI 30 單元語言地圖（三週期）──────────────────────
// 依語法骨架由淺到深排列。有 lessonId 的單元 = 已建好可練。
export type Unit = {
  unit: number;
  goal: string; // 目的
  focus: string; // 核心訓練點（語法）
  pattern: string; // 對應核心句型
  lessonId?: string;
};
export type Cycle = { cycle: number; title: string; clb: string; units: Unit[] };

export let learningPath: Cycle[] = [
  {
    cycle: 1,
    title: "第一週期：點火 (Ignition)",
    clb: "CLB 1-3",
    units: [
      { unit: 1, goal: "身份建立", focus: "系動詞與身份認同", pattern: "I am ___.", lessonId: "L_am" },
      { unit: 2, goal: "社交確認", focus: "一般疑問句與確認反饋", pattern: "Are you ___?", lessonId: "L_are" },
      { unit: 3, goal: "空間定位", focus: "存在感與方位反射", pattern: "Where is ___?", lessonId: "L_where" },
      { unit: 4, goal: "數量感知", focus: "基數詞與名詞複數", pattern: "I have ___.", lessonId: "L_have" },
      { unit: 5, goal: "所屬關係", focus: "領屬代詞與財產邊界", pattern: "This is my ___.", lessonId: "L_my" },
      { unit: 6, goal: "意志表達", focus: "助動詞與基本需求", pattern: "I need ___.", lessonId: "L_need" },
      { unit: 7, goal: "職業習慣", focus: "一般現在時與日常行為", pattern: "I ___ every day." },
      { unit: 8, goal: "社交博弈", focus: "祈使句與請求", pattern: "Could you ___?" },
      { unit: 9, goal: "否定防禦", focus: "否定結構與拒絕", pattern: "I don't ___." },
      { unit: 10, goal: "經驗回顧", focus: "一般過去時（規則動詞）", pattern: "Yesterday I ___ed." },
    ],
  },
  {
    cycle: 2,
    title: "第二週期：慣性 (Inertia)",
    clb: "CLB 4-5",
    units: [
      { unit: 11, goal: "未來投射", focus: "將來時與計劃", pattern: "I will ___." },
      { unit: 12, goal: "描述性感知", focus: "形容詞與程度修飾", pattern: "It is very ___." },
      { unit: 13, goal: "因果鏈條", focus: "連詞與邏輯反射", pattern: "___ because ___." },
      { unit: 14, goal: "行為頻率", focus: "頻度副詞與規律", pattern: "I always ___." },
      { unit: 15, goal: "動作進行", focus: "現在進行時與實時敘述", pattern: "I am looking for ___.", lessonId: "L_looking_for" },
      { unit: 16, goal: "工具使用", focus: "介詞與手段", pattern: "I go by ___." },
      { unit: 17, goal: "比較競爭", focus: "比較級與最高級", pattern: "___ is better than ___." },
      { unit: 18, goal: "義務責任", focus: "情態動詞 (Must / Should)", pattern: "I should ___." },
      { unit: 19, goal: "許可博弈", focus: "情態動詞 (May / Can)", pattern: "Can I ___?" },
      { unit: 20, goal: "感官體驗", focus: "感官動詞與直接反饋", pattern: "It looks ___." },
    ],
  },
  {
    cycle: 3,
    title: "第三週期：融合 (Fusion)",
    clb: "CLB 6+",
    units: [
      { unit: 21, goal: "完成狀態", focus: "現在完成時與結果", pattern: "I have ___ed." },
      { unit: 22, goal: "社交委婉", focus: "虛擬語氣與假設", pattern: "If I were you, I would ___." },
      { unit: 23, goal: "被動承受", focus: "被動語態與結果導向", pattern: "It was ___ed." },
      { unit: 24, goal: "複雜從句", focus: "定語從句與定義", pattern: "The one that ___." },
      { unit: 25, goal: "時間跨度", focus: "過去完成時與背景", pattern: "I had ___ed before ___." },
      { unit: 26, goal: "自我指涉", focus: "反身代詞與自動行為", pattern: "I did it myself." },
      { unit: 27, goal: "意向深度", focus: "動名詞與分詞", pattern: "I enjoy ___ing." },
      { unit: 28, goal: "社會關係", focus: "交互動詞與團隊", pattern: "Let's ___ together." },
      { unit: 29, goal: "決策辯論", focus: "複雜邏輯引導詞", pattern: "On the other hand, ___." },
      { unit: 30, goal: "敘事流", focus: "綜合時態轉換", pattern: "First ___, then ___, finally ___." },
    ],
  },
];

// ── 學習者 ──────────────────────────────────────────────────────
export const learner = {
  codename: "Neo",
  cycle: 1,
  estClb: "1.5",
  todayLessonId: "L_am", // 今日推薦（接近初學者 → 從 Unit 1 身份建立起步）
};

// ── 弱點引擎（本 App 最重要的功能）──────────────────────────────
export const weaknesses = {
  words: [
    { word: "utilities", mistakes: 4 },
    { word: "prescription", mistakes: 3 },
    { word: "lease", mistakes: 2 },
    { word: "deposit", mistakes: 2 },
  ],
  patterns: [
    { pattern: "I was looking for ___. (過去式)", issue: "時態常出錯", count: 5, lessonId: "L_looking_for" },
    { pattern: "Could you help me ___?", issue: "開口前遲疑過久", count: 3 },
  ],
  slow: [
    { pattern: "Could you help me ___?", avg: "4.2s" },
    { pattern: "I have a problem with ___.", avg: "3.8s" },
  ],
  structures: [
    { issue: "冠詞 a / an / the 遺漏", count: 7 },
    { issue: "過去式動詞變化", count: 5 },
    { issue: "介係詞 (in / at / on)", count: 3 },
  ],
};

// ── 進度（只看最重要的幾項）────────────────────────────────────
export const progress = {
  practiceDays: 6,
  accuracy: 84, // %
  avgSpeed: "2.8s",
  weakWords: weaknesses.words.length,
  weakPatterns: weaknesses.patterns.length,
  estClb: "4.0",
};

// ── DB 驅動：以 Supabase 載入的內容取代程式種子(由 content.ts 注入)──
// 先保存「原始程式種子」的參照,讓「上傳種子」永遠上傳程式碼版本(不受 DB 取代影響)
const SEED_VOCAB = vocabBank;
const SEED_LESSONS = lessons;
const SEED_PATH = learningPath;
export const seedContent = { vocab: SEED_VOCAB, lessons: SEED_LESSONS, learningPath: SEED_PATH };

export function setVocabBank(v: VocabWord[]) { if (v.length) vocabBank = v; }
export function setLessons(l: PatternLesson[]) { if (l.length) lessons = l; }
export function setLearningPath(p: Cycle[]) { if (p.length) learningPath = p; }
