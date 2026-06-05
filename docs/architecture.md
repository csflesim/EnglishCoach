# 系統架構 (Architecture) — MVP

> 📌 精簡版架構，對應目前實作。舊的龐大架構(8 引擎、24 張表、ERS 八維、遊戲化…)已封存於 [`archive/`](./archive/)。

---

## 技術棧 (Tech Stack)

- **前端**：Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **後端 / 資料庫**：Supabase (PostgreSQL) + Supabase Auth
- **AI**：OpenAI —— 只用兩個功能：**語音轉文字 (STT)** 與 **回應評估 (Evaluation)**
- **語音輸入偵測**：瀏覽器 Web Audio API（音量偵測 VAD，判斷「開口／說完」），免費、不需 API
- **部署**：Vercel

> 目前雛形以 mock 假資料 + 瀏覽器內建語音合成 (TTS) 運作，**無需任何金鑰即可預覽**。接真資料時只換掉 `lib/mock.ts`，UI 不動。

---

## 應用結構 (App Structure) — 三頁

```
app/
  page.tsx          # Page 1 訓練 (Training)：home / 操練 session / 完成，三態同頁
  weaknesses/       # Page 2 我的弱點
  progress/         # Page 3 進度
components/Shell.tsx # 共用框架 + 底部三頁導覽
app/api/stt/         # 語音轉文字 route (Whisper)；金鑰伺服器端
app/api/evaluate/    # 回應評分 route (gpt-4o-mini)
lib/mock.ts          # 資料層（句型課、單字庫、學習路徑）→ 之後換成 Supabase 查詢
lib/progress.ts      # 學習進度（localStorage 持久化、下一步推薦、掌握度）
lib/content.ts       # 後台內容覆蓋層（localStorage）
lib/ai.ts            # 前端呼叫 /api/stt、/api/evaluate（失敗回 null → 退回免費）
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

MVP 只需以下幾張表（其餘等需要再加）：

### 1. users_profile
`id` (uuid, PK)、`user_id` (FK auth.users)、`codename` (text)、`stage` (int)、`est_clb` (text)、`created_at`

### 2. patterns（句型庫，受控內容）
`id` (uuid, PK)、`pattern_text` (text，如 `I am looking for ___.`)、`unit` (int，對應 FSI 30 單元)、`drills` (jsonb)、`is_active` (bool)

> `drills` 結構：
> - `substitution`：漸進句框陣列 `[{ frame, frameZh, category }]`(第二層可選句框)。**變數不寫死**，由 `vocabulary` 依 `category` 抓取；每發 `answer = frame.replace("___", word)`、`nativeZh = frameZh.replace("___", word.nativeZh)`。
> - `transformation`：操作陣列 `[{ op, instruction, enFrom, enTo, zhFrom, zhTo, question? }]`。基準句框由使用者選(或 lesson 的 `transformFrame` 預設、否則 `substitution[0]`)，逐句字串轉換。
> - `expansion`：擴展鏈陣列 `[{ base, baseZh, layers:[{cue, answer, nativeZh}] }]`(每次抽 5 條輪替)。
> - `response`：`[{ cue, answer, nativeZh }]`(目前關閉)。
>
> lesson 另有可選 `transformFrame`(指定轉換預設句框)。單字依 `category` 跨單元共用(一個分類可餵多個句框/單元)。

### 3. vocabulary（替換變數來源 + 單字追蹤）
`id` (uuid, PK)、`user_id` (FK)、`word` (text)、`native_zh` (text)、`category` (text，供句框依類抓取)、`source` (text: seed/ai/user)、`used_count` (int，使用次數)、`status` (text: New/Learning/Weak/Known，熟悉度)、`last_seen` (timestamptz)、`created_at`

> **AI 補詞**:`POST /api/suggest-words`(gpt-4o-mini)依 `category`+句型建議 `[{word, nativeZh}]`,審核後以 `source=ai` 存入。句型結構不由 AI 生成,**只豐富變數**。MVP 用量/熟悉度暫存 localStorage。

### 4. attempts（每次作答）
`id` (uuid, PK)、`user_id` (FK)、`pattern_id` (FK)、`drill_type` (text: Substitution/Transformation/Expansion/Response)、`response_text` (text，STT 結果)、`accuracy` (int 0-100)、`reaction_seconds` (numeric)、`is_correct` (bool)、`feedback` (text)、`created_at`

### 5. weakness_items（弱點引擎核心）
`id` (uuid, PK)、`user_id` (FK)、`item_type` (text: word/pattern/structure/slow)、`ref` (text，指向單字／句型／結構描述)、`mistake_count` (int)、`avg_reaction` (numeric)、`status` (text: weak/learning/mastered)、`next_review` (timestamptz)、`updated_at`

> **進度 (Progress)** 不需獨立表，由 `attempts` 與 `weakness_items` 即時彙總(練習天數、正確率、平均反應、弱點數、估計 CLB)。
>
> **學習地圖推進 (Progression)**：記錄每課完成過的模式;一課所有可用模式都完成 → 該單元「掌握」。首頁據此推薦「下一步(Next Up)」單元、顯示 X/30 掌握。MVP 暫存於瀏覽器 `localStorage`(`erc_progress_v1`)，接後端後改由 `attempts` 彙總。

---

## AI 使用 (AI Usage)

**可選、手動開啟**(🤖 開關;需 `OPENAI_API_KEY`,未設則自動退回免費模式)。只有兩個 AI 呼叫,皆走自家 API 路由(金鑰只在伺服器端):

1. **STT** — `POST /api/stt`(`whisper-1`):上傳錄音 → 回 `{ text }`。
2. **Evaluation** — `POST /api/evaluate`(`gpt-4o-mini`,`response_format: json_object`):輸入 `{ pattern, expected, transcript, drillType }` → 回 `{ correct, accuracy, grammar, fluency, feedback(中文), weakness(標籤) }`。

- **回合制,非 Realtime**:每發說完才送一次;TTS 用瀏覽器內建(免費)。每天 1 小時約 $5/月。
- **自由發揮模式**:用同一個 Evaluation 端點評分(無 expected 時改判「是否正確使用該句型」)。
- **優雅退回**:任一呼叫失敗 / 無金鑰 → `lib/ai.ts` 回 `null` → 前端退回免費模式(只量反應速度、播正解),不崩。
- **不用 AI 生成課程或教文法**;課程一律來自 `patterns` + `vocabulary` + 學習路徑。

---

## 刻意不做的 (Deliberately Out of Scope)

為了「極簡、實用」，以下**現階段不做**(已封存於 archive，未來再議)：
多引擎學習智能、遊戲化(XP/軍階/世界地圖/寶箱)、ERS 八維加權、未來預測與場景模擬、Admin CMS、社群功能、付費與限額。
