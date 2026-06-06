# 變更紀錄 / 實作現況 (Changelog & Implementation Status)

> 本檔是**目前實際實作**的權威紀錄。`features.md` / `architecture.md` 為早期規格,部分已過時;以本檔為準。最後更新:2026-06-06。

---

## 1. 操練引擎 (Drill Engine)

### 變位引擎(6 人稱 × 時態/極性) — `lib/mock.ts` `renderSentence`
- 主詞涵蓋 **I / you / he / she / we / they**(+ it),由句框 `conj`(be / modal / 一般動詞 / `@verb` / `@perfect` / `@passive`)決定變位。
- 操作 (op):**現在 / 過去 / 否定 / 疑問 / 未來**,每種獨立處理(疑問句尾自動 `.→?`、中文 `。→ 嗎?`)。
- **替換 (Substitution)**:有變位的句框會輪替人稱(或固定某人稱 / 「全部輪流」);無變位的句框直接替換。
- **轉換 (Transformation)**:兩段選擇 — 先選句框,再選**人稱 + 操作**;用變位引擎即時生成。
- 頂部「句型」標籤**跟著當前該發**顯示(轉換會顯示實際變換句框,如「疑問:Am I ___?」)。

### 文法形態自動修正(引擎層、零成本、全句框通用)
- **數的一致**:複數主詞 (we/they) + be + 緊接的述語名詞「a X」→ **去冠詞 + 名詞變複數**(含不規則:man→men、woman→women、child→children、person→people…)。例:`They are a man` → **They are men**。受詞型(have/need、looking for a…)正確地維持單數。
- **冠詞 a/an**:依後字**發音**自動選用(`a engineer`→`an engineer`、`an hour`、`a university` / `a user` 例外處理)。

### 30 單元課程
- `lib/mock.ts` 以 `mk()` 建 30 課,每課定義 `substitution` 句框(含 `pos` / `slot` / `conj` / `op` / `subj`)。
- **轉換 / 擴展不另存**:轉換由 substitution 中帶 `conj` 的句框即時推導(DB `patterns` 的 transformation/expansion 列為空 `[]` 屬正常)。

---

## 2. 選詞引擎 (Word Selection)

- **使用中詞本**:`getActiveWordbook()`(localStorage),選詞只從該詞本抓。
- **語法槽位 (slot)**:句框標 `slot`(adj/count/mass/place/transport/role/verb_intrans/verb_trans…),選詞先依槽位過濾,確保詞性/可數性相容。
- **難易由易到難**:`vocabulary.difficulty` 排序,先簡單字。
- **答錯優先 + 間隔複習**:結合 SRS(見 §4),答錯/到期的字優先,保留約 ¼ 名額給複習。
- **AI 選詞過濾(bad_combos)**:開始前把「句框 × 候選字」沒判過的組合送 AI(FSI 規則,只排除**文法上不可能**的),結果(好+壞)寫入 `bad_combos`(`ok` 欄),**判過不重判**;選詞時自動排除壞組合。後台可檢視/還原。

---

## 3. 評分與辨識 (Scoring & Recognition)

三種模式並存,開關都記憶在 localStorage:

| 模式 | 開關 | 成本 | 行為 |
| :--- | :--- | :--- | :--- |
| **即時辨識** | 🎙 | 免費 | 瀏覽器 Web Speech 邊說邊顯示你說的字(支援的瀏覽器,如桌機 Chrome) |
| **本地比對** | ✅ | 免費(0 token) | 程式比對你說的 vs 正解;縮寫等價(I'm = I am);忽略標點大小寫 |
| **AI 評分** | 🤖 | gpt-4o-mini | **背景非阻塞**:練習中只收集,整輪結束後一次評分 |

- **背景 AI 評分**:練習中**不顯示對錯、唸完直接下一發**(FSI 重點是反射速度);整輪 20 發結束在「完成頁」**一次**送 AI(`/api/session-review`),回傳每發對錯 + 錯誤類別 + 整體弱點總結 + 下一步建議。比每發一次省 token。
- **錯誤分類**:單詞 / 文法 / 時態 / 冠詞 / 介係詞 / 字序 / 單複數 / 發音 / 用詞,逐筆寫入 `error_log` 供長期分析。
- **FSI 教練判準**:`/api/evaluate`、`/api/session-review`、`/api/check-frame` 都用「CIA/FSI pattern-drill coach」系統提示 — 判斷**句型操作正確**(結構/變位/人稱/語序),不要求真實世界慣用法(`Am I good?` 合法即正確);縮寫與完整形等價。
- **餵 Web Speech 文字給 AI**(取代 Whisper 上傳)以省成本;Whisper STT 仍保留為後備路徑。
- **反應時間 = 開口那一刻**:用 `reactionRef`(避免閉包讀到舊值);iOS 上 `onspeechstart` 常不觸發 → 改用**第一筆即時辨識結果**當開口時刻。

---

## 4. 間隔複習 SRS (`lib/review.ts`)

- **艾賓豪斯 + 萊特納**:`review_items`(kind = word / sentence / drill)記錄 box、wrong_count、status、next_review;`review_events` 記每次事件。
- **box 機制**:答對升 box(間隔變長)、答錯歸零;發數依 box 遞減(20/20/10/5/3)。
- **box 鏡像**:單字的 box 同步寫回 `vocabulary.box`,後台可見。
- **drill gap**:整輪全對 → 該 drill 升 box(下次發數變少、間隔變長);有錯 → 歸零。
- **單詞 / 句子分開**:操練中可分別標「✗ 單詞不熟」「✗ 句子不熟」。

---

## 5. 真實學習紀錄與分析

- **練習紀錄** `lib/practice.ts` → `practice_sessions`(時長、模式、課、發數、平均反應),驅動「我的」頁與打卡日曆。
- **學習分析頁** `/analysis`(取代 mock 弱點頁):弱單字 / 弱句子 / 弱句型(來自 `review_items`)、反應太慢(`slowByLesson`)、常錯結構(`error_log` 統計)、🤖 AI 深入分析。
- **打卡日曆**:真實月曆,可前後翻月、顯示日期數字、標記今天,依當天練習分鐘上色。
- **進度 / 我的頁**:學習地圖掌握數、連續天數、練習天數。

---

## 6. 掌握模型(細粒度階層) — `lib/progress.ts`

新模型(取代「完成任一模式即算」):

- **句框掌握** = 該句框**每一種人稱**都練過(替換有變位:6 人稱;固定主詞:該主詞;無變位:1 次)。
- **模式掌握** = 該模式**每一個句框**都掌握。
- **單元掌握** = **每一種模式**(替換 + 轉換)都掌握。
- **轉換**更嚴:每句框需 **6 人稱 × 4 操作 = 24 組合**。
- 進度以細粒度 key(`S|frame|person` / `T|frame|person|op`)存入 `progress.drill_type`(text 欄,無需改 schema)。
- 選單顯示各層進度與 ✓:模式清單(句框 X/Y)、句框清單(人稱 X/6、人稱×操作 X/24)、人稱/操作選單逐項 ✓。
- 舊的粗粒度 progress 列已清除(2026-06-06)。

---

## 7. UI / 設定

- **⚙ 設定面板**:8 個開關集中(🎤 麥克風 / 🎙 即時辨識 / 🔊 語音 / 🔁 Echo / 🌐 翻譯 / ✅ 本地比對 / 🤖 AI 評分 / 🧹 AI 選詞過濾),每個附功能說明、滑動式開關;**全部記憶到 localStorage**。
- **翻譯開關**:出題提示與正解下方的中文都受控(預設關,逼用英文反應);Echo 的中文不受影響(它的核心)。
- **手機 TTS 解鎖**:點擊手勢當下播一段靜音 utterance 解鎖 iOS 語音。

---

## 8. 後台 `/admin`

- **句型管理**:檢視/編修句框。
- **詞本**:檢視單字(分頁、搜尋,顯示 pos | difficulty | box | category)、選擇使用中詞本、建立詞本(含「ALL 全部」)。
- **封鎖名單**:檢視 `bad_combos` 不通組合、可「允許」還原。

---

## 9. 詞庫分類(一次性,離線)

- 透過平行 subagent 把 ~9393 單字寫入 `vocabulary`:分類 categories[]、pos、slots(8810)、difficulty(9389)、wordbooks[](CELPIP 5453 / IELTS 9389)。皆為一次性建置,操練時不呼叫 AI。

---

## 10. Supabase 資料表(目前實際使用)

| 表 | 用途 |
| :--- | :--- |
| `cycles` / `units` / `patterns` | 30 單元地圖 + 句型課種子複本 |
| `vocabulary` | 單字(word, native_zh, categories[], pos, slots[], difficulty, wordbooks[], box) |
| `wordbooks` | 詞本目錄(name, label) |
| `progress` | 細粒度掌握 key(lesson_id, drill_type) |
| `review_items` / `review_events` | SRS 複習項目與事件(box 鏡像到 vocabulary.box) |
| `practice_sessions` | 每輪練習紀錄 |
| `error_log` | 每筆錯誤分類(供長期分析) |
| `bad_combos` | 句框×單字 判定快取(ok 旗標) |

- **RLS**:自用版「匿名可讀寫」。**雙模式**:無金鑰 → 全部退回 localStorage。
- **SQL 遷移**:`supabase/` 下的 `migrate_v*.sql`(v3 詞本 → v10 error_log)需在 Supabase SQL Editor 依序執行。

---

## API 路由
- `POST /api/stt`(whisper-1)— 後備 STT
- `POST /api/evaluate`(gpt-4o-mini)— 單發評分(FSI 判準,目前主要由 session-review 取代)
- `POST /api/session-review`(gpt-4o-mini)— **整輪一次評分**(背景模式主力)
- `POST /api/check-frame`(gpt-4o-mini)— 選詞過濾(只排除文法不可能的組合)
- `POST /api/analyze`(gpt-4o-mini)— 學習分析頁的 AI 深入分析
