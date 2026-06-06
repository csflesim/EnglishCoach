# 系統架構 (Architecture) — MVP

> ⚠️ **本檔部分已過時**(評分流程、資料表、掌握模型已演進)。目前實作以 [`changelog.md`](./changelog.md) 為準;落差見 [`gap-analysis.md`](./gap-analysis.md)。
>
> 📌 精簡版架構，對應目前實作。舊的龐大架構(8 引擎、24 張表、ERS 八維、遊戲化…)已封存於 [`archive/`](./archive/)。

---

## 技術棧 (Tech Stack)

- **前端**：Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **後端 / 資料庫**：Supabase (PostgreSQL) + Supabase Auth
- **AI**：OpenAI —— 只用兩個功能：**語音轉文字 (STT)** 與 **回應評估 (Evaluation)**
- **語音輸入偵測**：瀏覽器 Web Audio API（音量偵測 VAD，判斷「開口／說完」），免費、不需 API
- **部署**：Vercel

> **現況**:已部署在 **Vercel**、接 **Supabase**(雙模式:有金鑰走雲端、否則 localStorage),手機/電腦共享同步。課程種子(句型課/單字)目前仍寫在程式碼 `lib/mock.ts`;Supabase 存會變動/要共享的資料(詞本、後台句框、進度)。TTS 用瀏覽器內建(免費);AI(STT+評分)為可選。

---

## 應用結構 (App Structure)

**前台(學習端)**:底部三頁導覽。**後台 `/admin`** 為獨立版面(與前台拆開,前台右上 ⚙ 進入)。

```
app/
  page.tsx          # 前台 訓練 (Training)：home / 選模式 / 操練 / 完成
  weaknesses/       # 前台 我的弱點(目前 mock 資料)
  progress/         # 前台 進度(X/30 掌握 + 統計)
  admin/            # 後台:句型管理 / 詞本 / 句型詞庫(獨立版面、含上傳種子)
  api/stt/          # 語音轉文字 route (Whisper);金鑰伺服器端
  api/evaluate/     # 回應評分 route (gpt-4o-mini)
components/Shell.tsx # 前台共用框架 + 底部導覽
lib/mock.ts          # 課程種子(句型課 lessons、單字 vocabBank、30 單元 learningPath) + buildSession
lib/content.ts       # 後台內容(句框/詞本/句型詞庫) 雙模式讀寫 + initContent
lib/progress.ts      # 學習進度 雙模式 + 下一步推薦 / 掌握度
lib/supabase.ts      # Supabase client + kv/表 存取(無金鑰 → hasSupabase=false 退回 localStorage)
lib/ai.ts            # 前端呼叫 /api/stt、/api/evaluate(失敗回 null → 退回免費)
```

---

## 操練 Session 流程 (Drill Session Logic)

**四式分開訓練**：一個 session = 一個核心句型的**單一模式**。流程：選句型 → 選模式 →（第二層）→ 連發 session。情境反應 (Response) 目前關閉。

- **替換**：第二層選**句框**(`I need ___.` / `I need to find ___.` / `I need to buy ___.`)，每框從單字庫對應分類抓字連發;整課目標約 20 發。
- **轉換**：**兩段第二層** — 先選**句框**、再選**操作**(過去/否定/疑問)。基準句取所選句框(預設 `transformFrame` 或 `substitution[0]`)填入其單字，逐句字串轉換(`enFrom→enTo`、`zhFrom→zhTo`，疑問再 `.→?`、`。→嗎？`)。每操作 ≈ 該句框字數(約 20)。
- **擴展**：每次抽 5 條擴展鏈(`expansionOffset` 輪替，下次換另外 5 條)，每條 = 基句 + 逐層加長(最多 5 層)。

每一發的狀態機：

```
(groupIntro)（進新句框/新操作/新基句時：示範句框 / 宣告操作）
cue（播放提示）
  → listening（計反應速度；等你開口，不會自動給答案）
  → speaking（你說話中；偵測靜音才結束，絕不中途打斷）
  → reveal（帶出正解 + 反應速度評級；可接 Echo Loop）
  → 下一發
```

- **反應速度量測**：從 cue 播完到你開口的秒數。`<1.5s` Excellent／`1.5–3s` Good／`3–6s` Learning／`>6s` Weak。
- **VAD**：`getUserMedia` + `AnalyserNode` 計算音量；超過門檻 = 開口，靜音 ≈0.9 秒 = 說完。
- **手動備援**：麥克風不可用時，改用「我開始說了／說完了」兩鍵，邏輯相同。
- **TTS 不被切斷**：所有朗讀以 `speechSynthesis` 的 `onend` 驅動推進(非固定計時)，長句中英文都完整;`onend` 失靈時才用依句長估算的保險計時。
- **Echo Loop（可選）**：reveal 階段可開啟 `Target(英) → [你覆述停頓] → Native(母語) → Target(英) → [你覆述停頓]` 的錨點循環(TTS 中英雙語播報，每次 Target 後留約一句話時間讓學習者覆述)；母語錨點來自 `patterns.drills[].nativeZh`，非即時翻譯。

---

## 資料模型 (Data Model)

> **重要**:課程種子(句型課、單字、30 單元地圖)目前是**程式碼** `lib/mock.ts`,操練直接讀它(快、離線)。Supabase 存「會變動 / 跨裝置共享」的資料。完整 SQL 見 [`supabase/schema.sql`](../supabase/schema.sql)。

### 已部署的 Supabase 資料表

| 表 | 欄位 | 用途 | App 狀態 |
| :--- | :--- | :--- | :--- |
| **kv** | `key` (PK)、`value` (jsonb)、`updated_at` | 通用鍵值:`content`={後台額外句框 frames}、`progress`=學習進度 | ✅ 讀寫 |
| **wordbooks** | `name` (PK)、`words` (jsonb)、`created_at` | 詞本(英文單字清單,可多本) | ✅ 讀寫 |
| **vocabulary** | `id`、`word`、`native_zh`、`category`、`source`、`created_at`(unique word+category) | 單字種子複本(後台「⬆ 上傳種子」寫入) | 📥 已上傳;app 仍讀程式內 `vocabBank`,此表供管理/日後讀取 |
| **patterns** | `id`、`unit`、`pattern_text`、`transform_frame`、`drills` (jsonb)、`created_at` | 句型課種子複本 | 📥 同上 |
| **units** | `unit` (PK)、`cycle`、`cycle_title`、`clb`、`goal`、`focus`、`pattern`、`lesson_id` | 學習地圖(30 單元三週期)種子複本 | 📥 同上 |
| **pattern_vocab** | `id`、`word`、`native_zh`、`category`、`pos`、`source`(unique word+category) | **句型詞庫**:AI 分類詞本後的單字(分類+中文) | ⏳ 待 AI 分類跑入 |

- **RLS**:自用版全部「**匿名可讀寫**」(個人工具最簡;多人前須改 Supabase Auth + 嚴格 policy)。
- **雙模式**:`lib/supabase.ts` 偵測 `NEXT_PUBLIC_SUPABASE_*`;無 → 全部退回 localStorage,app 照常運作。

### `patterns.drills` 結構(也是 `lib/mock.ts` 的 lesson 結構)
- `substitution`：漸進句框 `[{ frame, frameZh, category }]`。變數由 `category` 抓字;`answer = frame.replace("___", word)`、`nativeZh = frameZh.replace("___", word.nativeZh)`。
- `transformation`：操作 `[{ op, instruction, enFrom, enTo, zhFrom, zhTo, question? }]`,逐句字串轉換。
- `expansion`：擴展鏈 `[{ base, baseZh, layers:[{cue, answer, nativeZh}] }]`(每次抽 5 條輪替)。
- `response`：`[{ cue, answer, nativeZh }]`(目前關閉)。lesson 另有可選 `transformFrame`。

### 學習地圖推進 (Progression)
記錄每課完成過的模式;一課所有可用模式都完成 → 該單元「掌握」。首頁據此推薦「下一步(Next Up)」、顯示 X/30。存於 `kv.progress`(雲端)或 `localStorage`(無金鑰時)。

### ⏳ 規劃中(尚未建)
- `users_profile`(目前**無登入、單人**)
- `attempts`(每次作答紀錄)、`weakness_items`(弱點引擎)—— **弱點頁目前為 mock 假資料**,尚未由真實作答驅動。
- 「句型詞庫 AI 分類」「AI 補詞 `/api/suggest-words`」「自由發揮模式」「單字使用次數/複習專區」—— 已寫入規格,**程式未實作**。

---

## AI 使用 (AI Usage)

**可選、手動開啟**(🤖 開關;需 `OPENAI_API_KEY`,未設則自動退回免費模式)。只有兩個 AI 呼叫,皆走自家 API 路由(金鑰只在伺服器端):

1. **STT** — `POST /api/stt`(`whisper-1`):上傳錄音 → 回 `{ text }`。
2. **Evaluation** — `POST /api/evaluate`(`gpt-4o-mini`,`response_format: json_object`):輸入 `{ pattern, expected, transcript, drillType }` → 回 `{ correct, accuracy, grammar, fluency, feedback(中文), weakness(標籤) }`。

- **回合制,非 Realtime**:每發說完才送一次;TTS 用瀏覽器內建(免費)。每天 1 小時約 $5/月。
- **優雅退回**:任一呼叫失敗 / 無金鑰 → `lib/ai.ts` 回 `null` → 前端退回免費模式(只量反應速度、播正解),不崩。
- **不用 AI 生成課程或教文法**;課程一律來自 `patterns` + `vocabulary` + 學習路徑。
- ⏳ **規劃中**:自由發揮模式評分、AI 補詞 / 詞本分類(同樣走自家 route),尚未實作。

---

## 部署 (Deployment)

- **GitHub**:`csflesim/EnglishCoach`(`main` 分支)。push 後 Vercel 自動重部署。
- **Vercel**:Next.js 自動偵測。環境變數(Settings → Environment Variables):
  - `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(或舊版 `_ANON_KEY`)
  - `OPENAI_API_KEY`(可選;不設 = 免費模式)
- **Supabase**:在 SQL Editor 跑 `supabase/schema.sql` 建表;Project Settings → API 取得 URL/key。
- **本機開發**:`.env.local`(已 gitignore)放同樣的金鑰;手機測試用 `next dev --experimental-https -H 0.0.0.0` + 自簽憑證(`certificates/`,已 gitignore)讓麥克風可用。正式環境 Vercel 有真憑證,免此步。

---

## 刻意不做的 (Deliberately Out of Scope)

為了「極簡、實用」，以下**現階段不做**(已封存於 archive，未來再議)：
多引擎學習智能、遊戲化(XP/軍階/世界地圖/寶箱)、ERS 八維加權、未來預測與場景模擬、複雜版 Admin CMS(目前只有輕量 `/admin`)、社群功能、付費與限額、多人登入。
