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
// conj:人稱變位組。有 conj 的句框會展開不同人稱(I/You/He/She/We/They)。
//  "be" / "be_q"(疑問) / "@verb"(變數本身是動詞,第三人稱加 s) / 其他=固定動詞原形(如 have/need/go/will…)
// op:此句框替換時用哪種句式(預設 present);subj:固定主詞(如 "it",不輪替人稱)
export type SubFrame = { frame: string; frameZh: string; category: string; conj?: string; ger?: boolean; op?: "present" | "past" | "negative" | "question" | "future"; subj?: "I" | "you" | "he" | "she" | "we" | "they" | "it"; pos?: string; slot?: string };
export const TRANSFORM_OPS = ["past", "negative", "question", "future"] as const;
export type TransformOpKey = (typeof TRANSFORM_OPS)[number];
export const opLabel: Record<string, string> = { present: "現在", past: "過去式 (Past)", negative: "否定 (Negative)", question: "疑問 (Question)", future: "未來 (Will)" };
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
export type VocabWord = { word: string; nativeZh: string; category: string; pos?: string; slots?: string[]; difficulty?: number; wordbooks?: string[] };

// ── 選詞情境(由 app 注入:使用中詞本 + 單字複習狀態)──
export type WordReview = { status: string; wrong_count: number; next_review: string | null };
let activeWordbook: string | null = null;
let wordReviewMap: Map<string, WordReview> = new Map();
let badCombos: Set<string> = new Set(); // "frame|word" 不通組合,選詞時排除
export function setSelectionContext(wb: string | null, review: Map<string, WordReview>, bad?: Set<string>) {
  activeWordbook = wb;
  wordReviewMap = review;
  if (bad) badCombos = bad;
}
// 候選字(使用中詞本 + 文法槽,由易到難,排除已知不通)— 供 AI 過濾判斷
export function candidateWords(f: SubFrame, n = 40): string[] {
  let pool = vocabByCategory(f.category, f.pos, f.slot);
  if (activeWordbook && activeWordbook !== "ALL") pool = pool.filter((w) => w.wordbooks?.includes(activeWordbook!));
  pool = pool.filter((w) => !badCombos.has(`${f.frame}|${w.word}`));
  return pool.slice(0, n).map((w) => w.word);
}

// Phase 2 選詞:使用中詞本 → 文法槽 → 答錯優先 + 保留 ¼ 複習 + 其餘由易到難
export function selectForFrame(f: SubFrame, n = SUBSTITUTION_TARGET): VocabWord[] {
  let pool = vocabByCategory(f.category, f.pos, f.slot); // 已按 difficulty 由易到難
  if (activeWordbook && activeWordbook !== "ALL") pool = pool.filter((w) => w.wordbooks?.includes(activeWordbook!));
  if (badCombos.size) pool = pool.filter((w) => !badCombos.has(`${f.frame}|${w.word}`)); // 排除已標不通的組合
  if (pool.length <= n) return pool;
  const now = Date.now();
  const info = (w: VocabWord) => wordReviewMap.get(w.word);
  const overdue = (w: VocabWord) => { const r = info(w); return r?.next_review ? new Date(r.next_review).getTime() <= now : true; };
  const wrong = pool.filter((w) => { const r = info(w); return r && (r.status === "weak" || r.wrong_count > 0); });
  const reviewDue = pool.filter((w) => { const r = info(w); return r && r.wrong_count === 0 && r.status !== "weak" && overdue(w); });
  const wset = new Set([...wrong, ...reviewDue].map((w) => w.word));
  const fresh = pool.filter((w) => !info(w) && !wset.has(w.word));
  const others = pool.filter((w) => !wset.has(w.word) && info(w) && !reviewDue.includes(w));
  const reserve = Math.floor(n / 4); // ¼ 給複習(之前對過、到期)
  const out: VocabWord[] = [];
  const push = (arr: VocabWord[], limit: number) => { for (const w of arr) { if (out.length >= limit) break; if (!out.includes(w)) out.push(w); } };
  push(wrong, n - reserve); // 答錯優先(留出複習額度)
  push(reviewDue, out.length + reserve); // 保留 ¼ 複習
  push(fresh, n); // 沒用過、簡單先
  push(others, n); // 補滿
  return out.slice(0, n);
}

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

// 依分類抓字;pos 過濾(A)、slot 文法槽過濾(B,有資料才生效)、難易由易到難
export function vocabByCategory(category: string, pos?: string, slot?: string) {
  let pool = vocabBank.filter((v) => v.category === category);
  if (pos) pool = pool.filter((v) => !v.pos || v.pos === pos);
  if (slot && pool.some((v) => v.slots && v.slots.length)) pool = pool.filter((v) => v.slots?.includes(slot));
  return pool.slice().sort((a, b) => (a.difficulty ?? 9999) - (b.difficulty ?? 9999));
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
function mk(id: string, unit: number, patternText: string, substitution: SubFrame[]): PatternLesson {
  return { id, patternText, unit, substitution, transformation: [], expansion: [], response: [] };
}
export let lessons: PatternLesson[] = [
  mk("L_am",1,"I am ___.",[
    {frame:"{S} {v} ___.",frameZh:"{Sz}很 ___。",category:"describe",conj:"be",pos:"adj",slot:"adj"},
    {frame:"{S} {v} a ___.",frameZh:"{Sz}是 ___。",category:"person",conj:"be",pos:"n",slot:"role"},
    {frame:"{S} {v} at the ___.",frameZh:"{Sz}在 ___。",category:"place",conj:"be",pos:"n",slot:"place"},
  ]),
  mk("L_are",2,"Are you ___?",[
    {frame:"{S} {v} ___.",frameZh:"{Sz}很 ___。",category:"describe",conj:"be",op:"question",pos:"adj",slot:"adj"},
    {frame:"{S} {v} ___.",frameZh:"{Sz}覺得 ___。",category:"feeling",conj:"be",op:"question",pos:"adj",slot:"adj"},
  ]),
  mk("L_where",3,"Where is ___?",[
    {frame:"Where is the ___?",frameZh:"___ 在哪裡?",category:"place",pos:"n",slot:"place"},
    {frame:"Where is my ___?",frameZh:"我的 ___ 在哪?",category:"object",pos:"n",slot:"count"},
  ]),
  mk("L_have",4,"I have ___.",[
    {frame:"{S} {v} a ___.",frameZh:"{Sz}有 ___。",category:"object",conj:"have",pos:"n",slot:"count"},
    {frame:"{S} {v} some ___.",frameZh:"{Sz}有一些 ___。",category:"food",conj:"have",pos:"n",slot:"mass"},
  ]),
  mk("L_my",5,"This is my ___.",[
    {frame:"This is my ___.",frameZh:"這是我的 ___。",category:"object",pos:"n",slot:"count"},
    {frame:"This is my ___.",frameZh:"這是我的 ___。",category:"person",pos:"n",slot:"role"},
  ]),
  mk("L_need",6,"I need ___.",[
    {frame:"{S} {v} a ___.",frameZh:"{Sz}需要 ___。",category:"object",conj:"need",pos:"n",slot:"count"},
    {frame:"{S} {v} to ___.",frameZh:"{Sz}需要 ___。",category:"action",conj:"need",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u7",7,"I ___ every day.",[
    {frame:"{S} ___ every day.",frameZh:"{Sz}每天 ___。",category:"action",conj:"@verb",pos:"v",slot:"verb_intrans"},
    {frame:"{S} ___ at home.",frameZh:"{Sz}在家 ___。",category:"action",conj:"@verb",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u8",8,"Could you ___?",[
    {frame:"{S} {v} ___.",frameZh:"{Sz}可以 ___。",category:"action",conj:"could",op:"question",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u9",9,"I don't ___.",[
    {frame:"{S} ___ it.",frameZh:"{Sz} ___ 它。",category:"action",conj:"@verb",op:"negative",pos:"v",slot:"verb_trans"},
  ]),
  mk("L_u10",10,"Yesterday I ___ed.",[
    {frame:"{S} ___ yesterday.",frameZh:"{Sz}昨天 ___。",category:"action",conj:"@verb",op:"past",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u11",11,"I will ___.",[
    {frame:"{S} {v} ___.",frameZh:"{Sz}會 ___。",category:"action",conj:"will",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u12",12,"It is very ___.",[
    {frame:"{S} {v} very ___.",frameZh:"{Sz}很 ___。",category:"describe",conj:"be",subj:"it",pos:"adj",slot:"adj"},
  ]),
  mk("L_u13",13,"___ because ___.",[
    {frame:"{S} {v} ___ because of work.",frameZh:"{Sz}因為工作而 ___。",category:"feeling",conj:"be",pos:"adj",slot:"adj"},
    {frame:"{S} {v} happy because of my ___.",frameZh:"{Sz}因為我的 ___ 而開心。",category:"object",conj:"be",pos:"n",slot:"count"},
  ]),
  mk("L_u14",14,"I always ___.",[
    {frame:"{S} always ___.",frameZh:"{Sz}總是 ___。",category:"action",conj:"@verb",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_looking_for",15,"I am looking for ___.",[
    {frame:"{S} {v} looking for a ___.",frameZh:"{Sz}在找 ___。",category:"object",conj:"be",pos:"n",slot:"count"},
    {frame:"{S} {v} looking for the ___.",frameZh:"{Sz}在找 ___。",category:"place",conj:"be",pos:"n",slot:"place"},
  ]),
  mk("L_u16",16,"I go by ___.",[
    {frame:"{S} {v} by ___.",frameZh:"{Sz}搭 ___。",category:"transport",conj:"go",pos:"n",slot:"transport"},
  ]),
  mk("L_u17",17,"___ is better than ___.",[
    {frame:"Coffee is better than ___.",frameZh:"咖啡比 ___ 好。",category:"food",pos:"n",slot:"mass"},
    {frame:"A car is better than a ___.",frameZh:"車比 ___ 好。",category:"transport",pos:"n",slot:"transport"},
  ]),
  mk("L_u18",18,"I should ___.",[
    {frame:"{S} {v} ___.",frameZh:"{Sz}應該 ___。",category:"action",conj:"should",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u19",19,"Can I ___?",[
    {frame:"{S} {v} ___.",frameZh:"{Sz}可以 ___。",category:"action",conj:"can",op:"question",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u20",20,"It looks ___.",[
    {frame:"{S} {v} ___.",frameZh:"{Sz}看起來 ___。",category:"describe",conj:"look",subj:"it",pos:"adj",slot:"adj"},
  ]),
  mk("L_u21",21,"I have ___ed.",[
    {frame:"{S} ___ it.",frameZh:"{Sz}已經 ___ 它了。",category:"action",conj:"@perfect",pos:"v",slot:"verb_trans"},
  ]),
  mk("L_u22",22,"If I were you, I would ___.",[
    {frame:"If I were you, I would ___.",frameZh:"如果我是你,我會 ___。",category:"action",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u23",23,"It was ___ed.",[
    {frame:"{S} ___.",frameZh:"{Sz}被 ___。",category:"action",conj:"@passive",op:"past",subj:"it",pos:"v",slot:"verb_trans"},
  ]),
  mk("L_u24",24,"The one that ___.",[
    {frame:"I want the one that is ___.",frameZh:"我要 ___ 的那個。",category:"describe",pos:"adj",slot:"adj"},
  ]),
  mk("L_u25",25,"I had ___ed before.",[
    {frame:"{S} ___ before.",frameZh:"{Sz}先前已 ___。",category:"action",conj:"@perfect",op:"past",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u26",26,"I did it myself.",[
    {frame:"I ___ it myself.",frameZh:"我自己 ___ 它。",category:"action",pos:"v",slot:"verb_trans"},
  ]),
  mk("L_u27",27,"I enjoy ___ing.",[
    {frame:"{S} {v} ___.",frameZh:"{Sz}喜歡 ___。",category:"action",conj:"enjoy",ger:true,pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u28",28,"Let's ___ together.",[
    {frame:"Let's ___ together.",frameZh:"一起 ___ 吧。",category:"action",pos:"v",slot:"verb_intrans"},
  ]),
  mk("L_u29",29,"On the other hand, ___.",[
    {frame:"On the other hand, it is ___.",frameZh:"另一方面,它很 ___。",category:"describe",pos:"adj",slot:"adj"},
  ]),
  mk("L_u30",30,"First ___, then ___.",[
    {frame:"First I ___, then I leave.",frameZh:"我先 ___,然後離開。",category:"action",pos:"v",slot:"verb_intrans"},
  ]),
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

// ── 變位引擎(6 人稱 × 時態/極性/句式)──
export const PERSON_ORDER = ["I", "you", "he", "she", "we", "they"] as const;
export type PKey = "I" | "you" | "he" | "she" | "we" | "they" | "it";
type Op = "present" | "past" | "negative" | "question" | "future";
const SUBJ: Record<PKey, { en: string; zh: string }> = {
  I: { en: "I", zh: "我" }, you: { en: "You", zh: "你" }, he: { en: "He", zh: "他" },
  she: { en: "She", zh: "她" }, we: { en: "We", zh: "我們" }, they: { en: "They", zh: "他們" }, it: { en: "It", zh: "它" },
};
const BE: Record<PKey, string> = { I: "am", you: "are", he: "is", she: "is", we: "are", they: "are", it: "is" };
const MODALS = new Set(["will", "would", "shall", "should", "can", "could", "may", "might", "must"]);
const MODAL_NEG: Record<string, string> = { will: "won't", would: "wouldn't", can: "can't", could: "couldn't", should: "shouldn't", may: "may not", might: "might not", must: "mustn't", shall: "shan't" };
const MODAL_PAST: Record<string, string> = { will: "would", can: "could", may: "might", shall: "should" };
const IRREG3: Record<string, string> = { have: "has", go: "goes", do: "does", be: "is" };
const IRREGPAST: Record<string, string> = {
  be: "was", have: "had", go: "went", do: "did", make: "made", take: "took", get: "got", see: "saw",
  come: "came", say: "said", know: "knew", give: "gave", find: "found", think: "thought", buy: "bought",
  bring: "brought", eat: "ate", drink: "drank", run: "ran", read: "read", write: "wrote", drive: "drove",
  pay: "paid", meet: "met", sit: "sat", stand: "stood", lose: "lost", feel: "felt", leave: "left",
  keep: "kept", send: "sent", spend: "spent", build: "built", teach: "taught", catch: "caught",
  sleep: "slept", win: "won", begin: "began", become: "became", hold: "held", speak: "spoke", wear: "wore", choose: "chose",
};
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function third(v: string): string {
  if (IRREG3[v]) return IRREG3[v];
  if (/(s|x|z|ch|sh)$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
}
function pastForm(v: string): string {
  if (IRREGPAST[v]) return IRREGPAST[v];
  if (/e$/.test(v)) return v + "d";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ied";
  return v + "ed";
}
function gerund(v: string): string {
  if (/[^aeiou]e$/.test(v)) return v.slice(0, -1) + "ing";
  return v + "ing";
}
// 名詞複數(供「主詞為複數 + be + 述語名詞」時做數的一致,如 They are a man → They are men)
const IRREG_PLURAL: Record<string, string> = {
  man: "men", woman: "women", child: "children", person: "people", tooth: "teeth", foot: "feet",
  mouse: "mice", goose: "geese", wife: "wives", life: "lives", knife: "knives", leaf: "leaves",
  half: "halves", self: "selves", thief: "thieves", loaf: "loaves",
  fish: "fish", sheep: "sheep", deer: "deer", series: "series", species: "species",
};
// 冠詞 a/an 修正(依後字發音):母音音起頭用 an;含無聲 h(an hour)與子音音的 u/eu(a university)例外
const AN_WORDS = ["hour", "honest", "honor", "honour", "heir", "honate"]; // 無聲 h → an
const A_WORDS = ["university", "universe", "unit", "uniform", "unique", "user", "useful", "usual", "union", "universal", "unicorn", "european", "euro", "one", "once"]; // 子音音(yu/w)→ a
function vowelSound(word: string): boolean {
  const w = word.toLowerCase();
  if (AN_WORDS.some((x) => w === x || w.startsWith(x))) return true;
  if (A_WORDS.some((x) => w === x || w.startsWith(x))) return false;
  return /^[aeiou]/.test(w);
}
function fixArticle(s: string): string {
  return s.replace(/\b(a|A) ([A-Za-z]+)/g, (_m, art: string, word: string) =>
    vowelSound(word) ? `${art === "A" ? "An" : "an"} ${word}` : `${art} ${word}`,
  );
}
function pluralNoun(n: string): string {
  if (n === "___") return "___";
  const low = n.toLowerCase();
  if (IRREG_PLURAL[low]) { const pl = IRREG_PLURAL[low]; return n[0] === n[0].toUpperCase() ? cap(pl) : pl; }
  if (/(s|x|z|ch|sh)$/.test(low)) return n + "es";
  if (/[^aeiou]y$/.test(low)) return n.slice(0, -1) + "ies";
  if (/fe$/.test(low)) return n.slice(0, -2) + "ves";
  if (/[^aeiou]f$/.test(low)) return n.slice(0, -1) + "ves";
  return n + "s";
}
// 取得句框的 動詞base + 變數後綴(tail)
type Kind = "be" | "modal" | "verb" | "perfect" | "passive";
function frameParts(f: SubFrame, wordEn: string): { kind: Kind; base: string; pre: string; tail: string } {
  if (f.conj === "@verb" || f.conj === "@perfect" || f.conj === "@passive") {
    const i = f.frame.indexOf("___");
    const pre = f.frame.slice(0, i).replace("{S}", "").trimStart(); // 動詞前的副詞,如 "always "
    const tail = f.frame.slice(i + 3);
    const kind: Kind = f.conj === "@perfect" ? "perfect" : f.conj === "@passive" ? "passive" : "verb";
    return { kind, base: wordEn, pre, tail };
  }
  const after = f.frame.split("{v}")[1] ?? " ___.";
  const wp = f.ger ? gerund(wordEn) : wordEn;
  const base = f.conj ?? "be";
  const kind: Kind = base === "be" ? "be" : MODALS.has(base) ? "modal" : "verb";
  return { kind, base, pre: "", tail: after.replace("___", wp) };
}
// 核心:把句框渲染成 (人稱, op) 的句子
function renderSentence(f: SubFrame, p: PKey, wordEn: string, wordZh: string, op: Op): { en: string; native: string } {
  const s = SUBJ[p];
  const subjCap = p === "I" ? "I" : s.en;
  const subjLow = p === "I" ? "I" : s.en.toLowerCase();
  const is3 = p === "he" || p === "she" || p === "it";
  const Q = op === "question";
  const { kind, base, pre, tail: tail0 } = frameParts(f, wordEn);
  let tail = tail0;
  const P = pre; // 前置副詞(可空)
  // 數的一致:複數主詞(we/they)+ be + 緊接的述語名詞「a/an X」→ 去冠詞、名詞變複數
  if ((p === "we" || p === "they") && kind === "be") {
    const m = tail.match(/^(\s*)an?\s+(.+?)([.?!]*)$/);
    if (m) {
      const words = m[2].split(" ");
      words[words.length - 1] = pluralNoun(words[words.length - 1]);
      tail = `${m[1]}${words.join(" ")}${m[3]}`;
    }
  }
  let en = "";
  // op 各自獨立:present / question(現在疑問)/ past / future / negative(現在否定)
  if (kind === "be") {
    const pres = BE[p];
    const past = p === "you" || p === "we" || p === "they" ? "were" : "was";
    if (op === "question") en = `${cap(pres)} ${subjLow}${tail}`;
    else if (op === "past") en = `${subjCap} ${past}${tail}`;
    else if (op === "future") en = `${subjCap} will be${tail}`;
    else if (op === "negative") en = `${subjCap} ${pres} not${tail}`;
    else en = `${subjCap} ${pres}${tail}`;
  } else if (kind === "passive") {
    const pp = pastForm(base);
    const pres = BE[p];
    const past = p === "you" || p === "we" || p === "they" ? "were" : "was";
    if (op === "question") en = `${cap(pres)} ${subjLow} ${pp}${tail}`;
    else if (op === "past") en = `${subjCap} ${past} ${pp}${tail}`;
    else if (op === "future") en = `${subjCap} will be ${pp}${tail}`;
    else if (op === "negative") en = `${subjCap} ${pres} not ${pp}${tail}`;
    else en = `${subjCap} ${pres} ${pp}${tail}`;
  } else if (kind === "perfect") {
    const pp = pastForm(base);
    const hv = is3 ? "has" : "have";
    if (op === "question") en = `${cap(hv)} ${subjLow} ${pp}${tail}`;
    else if (op === "past") en = `${subjCap} had ${pp}${tail}`;
    else if (op === "future") en = `${subjCap} will have ${pp}${tail}`;
    else if (op === "negative") en = `${subjCap} ${is3 ? "hasn't" : "haven't"} ${pp}${tail}`;
    else en = `${subjCap} ${hv} ${pp}${tail}`;
  } else if (kind === "modal") {
    if (op === "question") en = `${cap(base)} ${subjLow}${tail}`;
    else if (op === "past") en = `${subjCap} ${MODAL_PAST[base] ?? base}${tail}`;
    else if (op === "negative") en = `${subjCap} ${MODAL_NEG[base] ?? base + " not"}${tail}`;
    else en = `${subjCap} ${base}${tail}`; // present / future
  } else {
    if (op === "question") en = `${is3 ? "Does" : "Do"} ${subjLow} ${P}${base}${tail}`;
    else if (op === "past") en = `${subjCap} ${P}${pastForm(base)}${tail}`;
    else if (op === "future") en = `${subjCap} ${P}will ${base}${tail}`;
    else if (op === "negative") en = `${subjCap} ${P}${is3 ? "doesn't" : "don't"} ${base}${tail}`;
    else en = `${subjCap} ${P}${is3 ? third(base) : base}${tail}`;
  }
  en = fixArticle(en); // 冠詞 a/an 依後字發音修正
  if (Q) en = en.replace(/\.$/, "?");
  let native = f.frameZh.replace("{Sz}", s.zh).replace("___", wordZh);
  if (op === "question") native = native.replace(/。$/, "嗎?");
  else if (op === "negative") native = "(否定) " + native;
  else if (op === "past") native = "(過去) " + native;
  else if (op === "future") native = "(將) " + native;
  return { en: en.trim(), native };
}
// 顯示用(依句框的 subj/op;保留 ___);無 conj 的句框直接顯示原文
export function frameDisplay(f: SubFrame): string {
  return f.conj ? renderSentence(f, f.subj ?? "I", "___", "___", f.op ?? "present").en : f.frame;
}

// key：替換時指定句框(frame)、轉換時指定操作(op)；frameKey：轉換指定句框；person：轉換指定人稱
export function buildSession(lesson: PatternLesson, type: DrillType, key?: string, frameKey?: string, person?: PKey | "all"): Step[] {
  if (type === "Substitution") {
    const all = framesOf(lesson);
    const frames = key ? all.filter((f) => f.frame === key) : all;
    const steps: Step[] = [];
    for (const f of frames) {
      const words = selectForFrame(f);
      words.forEach((w, i) => {
        if (f.conj) {
          // 固定主詞(subj)優先;否則指定人稱→全用;再否則輪流
          const p: PKey = f.subj ?? (person && person !== "all" ? person : PERSON_ORDER[i % PERSON_ORDER.length]);
          const r = renderSentence(f, p, w.word, w.nativeZh, f.op ?? "present");
          const label = renderSentence(f, p, "___", "___", f.op ?? "present").en; // 該人稱的句型(保留 ___)
          steps.push({ type, cue: w.word, answer: r.en, nativeZh: r.native, groupKey: f.frame, groupTitle: label });
        } else {
          steps.push({ type, cue: w.word, answer: f.frame.replace("___", w.word), nativeZh: f.frameZh.replace("___", w.nativeZh), groupKey: f.frame, groupTitle: f.frame });
        }
      });
    }
    return key ? steps : steps.slice(0, SUBSTITUTION_TARGET);
  }
  if (type === "Transformation") {
    const fr = framesOf(lesson).filter((f) => f.conj);
    const f = fr.find((x) => x.frame === frameKey) ?? fr[0];
    if (!f) return [];
    const p: PKey = f.subj ?? (person && person !== "all" ? person : "I");
    const op = (key ?? "past") as Op;
    const label = renderSentence(f, p, "___", "___", op).en; // 該人稱+操作的句型(保留 ___),供頂部「句型」同步
    const steps = selectForFrame(f).map((w) => {
      const r = renderSentence(f, p, w.word, w.nativeZh, op);
      return { type, cue: w.word, answer: r.en, nativeZh: r.native, groupKey: op, groupTitle: `${opLabel[op]}:${label}` };
    });
    return steps.slice(0, SUBSTITUTION_TARGET);
  }
  return lesson.response.map((r) => ({ type, cue: r.cue, answer: r.answer, nativeZh: r.nativeZh }));
}

export function modeCount(lesson: PatternLesson, type: DrillType) {
  return buildSession(lesson, type).length;
}

// 一課實際有內容的模式（替換 + 轉換；轉換需有可變位的句框）
export function availableModes(lesson: PatternLesson): DrillType[] {
  const m: DrillType[] = [];
  if (framesOf(lesson).length) m.push("Substitution");
  if (framesOf(lesson).some((f) => f.conj)) m.push("Transformation");
  return m;
}

// 替換句框的發數（供第二層選單顯示）
export function subFrameCount(f: SubFrame) {
  return Math.min(vocabByCategory(f.category, f.pos, f.slot).length, SUBSTITUTION_TARGET);
}

// 轉換的可變位句框(供選單)
export function transformFrames(lesson: PatternLesson): SubFrame[] {
  return framesOf(lesson).filter((f) => f.conj);
}
// 轉換某句框+人稱+操作的示範
export function transformExample(lesson: PatternLesson, op: TransformOpKey, frameKey?: string, person: PKey | "all" = "I") {
  const fr = transformFrames(lesson);
  const f = fr.find((x) => x.frame === frameKey) ?? fr[0];
  const w = f ? vocabByCategory(f.category, f.pos, f.slot)[0] : undefined;
  if (!f || !w) return { cue: "", answer: "" };
  const r = renderSentence(f, f.subj ?? (person === "all" ? "I" : person), w.word, w.nativeZh, op);
  return { cue: w.word, answer: r.en };
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
