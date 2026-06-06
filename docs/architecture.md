# 系統架構 (Architecture)

> ✅ 本檔已對齊**目前實作**(2026-06-06)。變更時序見 [`changelog.md`](./changelog.md);未做的規格見 [`gap-analysis.md`](./gap-analysis.md)。
> 舊的龐大架構(8 引擎、24 張表、ERS 八維、遊戲化…)封存於 [`archive/`](./archive/)。

---

## 技術棧 (Tech Stack)

- **前端**:Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **後端 / 資料庫**:Supabase (PostgreSQL),RLS「匿名可讀寫」(自用版)
- **AI**:OpenAI(gpt-4o-mini 評分/分析/選詞過濾、whisper-1 後備 STT)
- **語音**:瀏覽器 **Web Speech**(免費即時辨識)+ **Web Audio VAD**(音量偵測開口/說完)+ **speechSynthesis**(TTS)
- **部署**:Vercel(push `main` 自動重部署)

> **雙模式**:`lib/supabase.ts` 偵測 `NEXT_PUBLIC_SUPABASE_*`;有金鑰走雲端(跨裝置同步),無則全部退回 `localStorage`,app 照常運作。課程種子(句型課/單字)寫在 `lib/mock.ts`;Supabase 存會變動/要共享的資料。

---

## 應用結構 (App Structure)

```
app/
  page.tsx              # 訓練:home / 選模式 / 第二層 / 操練 / 完成(含整輪 AI 分析)+ ⚙ 設定面板
  words/  sentences/    # 單詞 / 句子 複習(SRS 卡片)
  analysis/             # 學習分析(真實:弱項 + 反應太慢 + 常錯結構 + AI 深入分析)
  progress/             # 我的(掌握數 / 天數 / 真實月曆打卡)
  admin/                # 後台:句型管理 / 詞本 / 封鎖名單
  api/stt/              # whisper-1(後備 STT)
  api/evaluate/         # gpt-4o-mini(單發評分,FSI 判準)
  api/session-review/   # gpt-4o-mini(整輪一次評分 — 背景模式主力)
  api/check-frame/      # gpt-4o-mini(選詞過濾,只排除文法不可能組合)
  api/analyze/          # gpt-4o-mini(學習分析建議)
components/
  Shell.tsx             # 共用框架 + 底部導覽(訓練/單詞/句子/分析/我的)
  StreakCalendar.tsx    # 真實月曆打卡(可翻月)
lib/
  mock.ts               # 課程種子 + 變位引擎(renderSentence)+ buildSession + 選詞(selectForFrame)
  content.ts            # 詞本 / error_log / bad_combos 雙模式讀寫 + initContent(雲端載入)
  progress.ts           # 細粒度掌握模型(人稱×句框×模式)+ 下一步推薦
  review.ts             # SRS(艾賓豪斯 + 萊特納 box、drill gap)
  practice.ts           # 練習紀錄 / 統計 / 反應太慢
  match.ts              # 本地比對(縮寫等價)
  ai.ts                 # 前端呼叫各 API route(失敗回 null → 退回免費)
  supabase.ts           # client + 分頁讀寫(無金鑰 → hasSupabase=false)
```

---

## 操練 Session 流程 (Drill Session Logic)

一個 session = 一個核心句型的**單一模式**。流程:選句型 → 選模式 →(第二層)→ 連發。

- **替換**:第二層選句框;有變位的句框再選人稱(或「全部輪流」)。每框從單字庫依 `category`+`slot` 抓字、由易到難、答錯優先。
- **轉換**:兩段第二層 — 先選句框,再選人稱 + 操作(過去/否定/疑問/未來);用**變位引擎**即時生成。
- **擴展**:⏳ 未實作。

每一發狀態機:
```
(groupIntro) 進新句框/操作時先示範
cue(播提示)
  → listening(計反應速度;等你開口,不自動給答案)
  → speaking(你說話中;偵測說完才結束,不中途打斷)
  → reveal(帶出正解 + 反應評級;可接 Echo Loop)
  → 下一發
```

- **反應速度**:從 cue 播完到**開口那一刻**(用 `reactionRef` 避免閉包讀舊值;iOS 無 `onspeechstart` 時用第一筆辨識結果)。`<1.5s` Excellent … `>6s` Weak。
- **辨識**:wsMode(Web Speech)只用 SpeechRecognition;非 wsMode 用 VAD(`AnalyserNode` 音量)+ 手動兩鍵備援。
- **TTS 不被切斷**:以 `onend` 驅動推進,`onend` 失靈才用估算保險計時。
- **評分**:🤖 背景模式練習中不評分,整輪結束送 `/api/session-review`;✅ 本地比對即時(不顯示,答錯仍記);兩者皆關 → 只量反應速度。

---

## 變位引擎 (Conjugation Engine) — `lib/mock.ts`

- `renderSentence(frame, person, word, wordZh, op)`:依 `conj`(be / modal / 一般動詞 / `@verb` / `@perfect` / `@passive`)與 `op`(present/past/negative/question/future)生成句子。
- 人稱:I / you / he / she / we / they(+ it)。
- **文法修正**:數的一致(複數主詞 + be + 述語名詞 → 複數去冠詞)、冠詞 a/an(依發音)。
- 轉換答案即時生成,**不使用** `enFrom→enTo` 字串對應表。

---

## 資料模型 (Data Model)

> 課程種子在 `lib/mock.ts`(快、離線);Supabase 存「會變動/跨裝置共享」的資料。

| 表 | 主要欄位 | 用途 |
| :--- | :--- | :--- |
| **cycles / units / patterns** | 見種子 | 30 單元地圖 + 句型課複本(轉換/擴展列為空,屬正常) |
| **vocabulary** | `word, native_zh, categories[], pos, slots[], difficulty, wordbooks[], box` | 單字庫(已分類 9393 字) |
| **wordbooks** | `name, label` | 詞本目錄(含 ALL) |
| **progress** | `lesson_id, drill_type` | **細粒度掌握 key**(`S|frame|person` / `T|frame|person|op`) |
| **review_items** | `kind, ref, text, box, wrong_count, status, next_review` | SRS 項目(word/sentence/drill);box 鏡像到 vocabulary.box |
| **review_events** | 事件流 | 每次複習事件 |
| **practice_sessions** | `duration_sec, drill_type, lesson_id, reps, avg_reaction` | 每輪練習紀錄 |
| **error_log** | `kind, expected, said, lesson_id` | 每筆錯誤分類(長期分析) |
| **bad_combos** | `frame, word, ok, reason` | 句框×字 判定快取(ok 旗標) |

- **RLS**:全部匿名可讀寫(自用;多人前須改 Auth + 嚴格 policy)。
- **SQL 遷移**:`supabase/migrate_v3..v10.sql` 依序在 SQL Editor 執行(v3 詞本 → v6 review box → v7 vocab box → v8 bad_combos → v9 combo ok → v10 error_log)。

### 掌握判定 (Progression) — `lib/progress.ts`
- 句框掌握 = 每人稱完成;模式掌握 = 每句框掌握;單元掌握 = 每模式掌握(轉換需 6×4)。
- 完成寫入細粒度 key 到 `progress.drill_type`(text,無需改 schema)。

---

## AI 使用 (AI Usage)

可選、手動開啟(需 `OPENAI_API_KEY`,未設則退回免費)。皆走自家 route(金鑰伺服器端),失敗回 `null` → 前端優雅退回。

1. **session-review**(整輪一次評分,背景主力)— 回每發對錯 + 錯誤分類 + 總結 + 建議。
2. **check-frame**(選詞過濾)— 只排除文法不可能的組合,結果存 `bad_combos`。
3. **analyze**(學習分析建議)。
4. **stt**(whisper-1,後備)、**evaluate**(單發,保留)。

- **省成本**:餵 Web Speech 文字給 AI(免上傳音訊);整輪一次取代每發一次;判過的組合快取不重判。
- **FSI 判準**:判句型操作正確(結構/變位/人稱/語序),不要求真實慣用法;縮寫等價。
- **不用 AI 生成課程或教文法**。

---

## 部署 (Deployment)

- **GitHub** `main` → Vercel 自動重部署。
- **Vercel 環境變數**:`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(或舊 `_ANON_KEY`)、`OPENAI_API_KEY`(可選)。
- **Supabase**:SQL Editor 執行 `supabase/schema.sql` + `migrate_v*.sql`。
- **本機**:`.env.local`(gitignore);手機測麥克風用 `next dev --experimental-https`。

---

## 刻意不做的 / 未實作 (Out of Scope / Not Yet)

- **未實作(規格保留)**:擴展操練 Expansion、自由發揮模式 Free Practice、AI 補詞 `/api/suggest-words`(見 gap-analysis)。
- **刻意不做**:多引擎學習智能、遊戲化、ERS 八維、複雜 CMS、社群、付費限額、多人登入。
