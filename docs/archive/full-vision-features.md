# 核心功能與產品設計 (Core Features)

本文件詳細記錄 **English Reflex Coach** 學習端與管理端的各項功能設計及規格。

---

## 🚀 1. 註冊與引導流程 (Onboarding Flow)

引導使用者設定個人目標，並完成初步能力評測，以客製化學習路徑。

```mermaid
graph LR
    Step1[步驟 1: 目標探索] --> Step2[步驟 2: 設定目標分數]
    Step2 --> Step3[步驟 3: 學習計劃]
    Step3 --> Step4[步驟 4: 分級測試]
    Step4 --> Dashboard[進入儀表板]
```

* **步驟 1：目標探索 (Goal Discovery)**
  - 問題：*Why are you learning English?*（可多選）
  - 分類選項：檢定準備 (Exam)、移民需求 (Immigration)、職涯發展 (Career)、生活適應 (Lifestyle)。
* **步驟 2：設定目標分數 (Target Goal)**
  - 檢定對照：如選擇 CELPIP $\rightarrow$ 設定目標 CLB；選擇 IELTS $\rightarrow$ 設定目標 Band；選擇 TOEIC $\rightarrow$ 設定目標分數。
  - 一般等級目標：初級 (Beginner) / 中級 (Intermediate) / 高級 (Advanced) / 流利 (Fluent)。
* **步驟 3：學習計劃 (Study Plan)**（提供兩種模式設定）
  - **模式 A**：設定每日學習時間（15 / 30 / 45 / 60 / 90 分鐘），系統自動計算預估達成目標等級之日期。
  - **模式 B**：設定想要達成的目標等級與目標日期，系統反向計算每日所需的學習時間。
* **步驟 4：分級測試 (Placement Test)**
  - **測驗時長**：5 – 10 分鐘。
  - **測驗結構**：
    1. 單字識別 (Vocabulary Recognition) — 10 題
    2. 句型運用 (Pattern Manipulation) — 8 題
    3. 聽力理解 (Listening Comprehension) — 5 題
    4. 口說回答 (Speaking Response) — 3 題引導
    5. 情境反應 (Situational Reaction) — 5 題引導
  - **評分加權比重**：
    - 單字 (Vocabulary)：20%
    - 句型運用 (Pattern Manipulation)：25%
    - 聽力 (Listening)：15%
    - 口說 (Speaking)：25%
    - 反應速度 (Reaction Speed)：15%
  - **測驗輸出結果**：
    - 當前 ERS 內部反射分數
    - 預估之 CLB 等級
    - 對照檢定換算（IELTS、CEFR、TOEIC、TOEFL、PTE、DET）
    - 個人強項 (Strengths) 與 弱點區域 (Weak Areas)
    - 系統產生的每日建議計畫 (Recommended Daily Plan)


---

## 🎯 2. 句型操練與內容庫 (Pattern & Topic Library)

### A. 句型庫 (Pattern Library)
- 收錄 **100 個核心句型**，依據 CLB 難易度循序漸進組織。
- **句型範例**：
  - *I am ___.* (CLB 1-2)
  - *I need ___.* (CLB 2-3)
  - *I am looking for ___.* (CLB 3-4)
  - *Could you help me ___?* (CLB 4-5)
  - *I prefer ___ because ___.* (CLB 5-6)
  - *In my opinion ___.* (CLB 6-7)
  - *I recommend ___.* (CLB 7-8)
  - *If I were you ___.* (CLB 8-9)
  - *One memorable experience was ___.* (CLB 9-10)
  - *Overall I think ___.* (CLB 10-12)
- 句型將儲存在資料庫中，讓 AI 能夠根據不同情境動態套用並生成操練題。

### B. 主題池 (Topic Pool)
涵蓋五大核心情境主題，可透過 Admin CMS 彈性增刪管理：
1. **日常基礎**：住房 (Housing)、交通 (Transportation)、購物 (Shopping)、餐廳 (Restaurant)、醫療 (Healthcare)、銀行 (Banking)、家庭 (Family)、朋友 (Friends)、興趣 (Hobbies)、科技 (Technology)
2. **移民生活**：租房 (Renting)、水電瓦斯 (Utilities)、大眾運輸 (Public Transit)、政府服務 (Government Services)
3. **觀光旅遊**：機場 (Airport)、飯店 (Hotel)、旅行 (Travel)、旅途狀況 (Travel Problems)、租車 (Car Rental)
4. **職場英文**：求職面試 (Job Interview)、職場適應 (Workplace)、會議溝通 (Meetings)、客戶服務 (Customer Service)、業務銷售 (Sales)
5. **商務高階**：商務溝通 (Business Communication)、創業 (Entrepreneurship)、領導力 (Leadership)、團隊合作 (Teamwork)、問題解決 (Problem Solving)

### C. 情境庫 (Situation Library)
每個主題下包含多個真實生活情境。例如：
- **住房 (Housing)**：尋找公寓、看房、與房東對話、房租上漲、設備報修。
- **客戶服務 (Customer Service)**：申請退款、收到錯誤商品、客訴處理、技術支援。
- **觀光旅遊 (Travel)**：行李遺失、錯過班機、飯店登記入住。
- **商務 (Business)**：拜訪客戶、商務談判、專案進度報告。

> 💡 **AI 生成機制**：AI 引擎會動態結合 **主題 (Topic) + 情境 (Situation) + 核心句型 (Pattern)**，為學習者生成無限量的對話與操練內容。

### D. 目標引導之主題權重分配規則 (Goal-Driven Topic Weighting Rules)
註冊與目標設定完成後，系統會依據學習者所選之學習目標，動態配置主題池 (Topic Pool) 的權重比例，以確保核心操練符合使用者的真實需求：
- **目標權重配置範例**：
  * **思培與加拿大移民 (CELPIP + Canada Immigration)**：思培任務 (CELPIP Tasks) 40%、住房 (Housing) 15%、移民生活 (Immigration) 15%、日常基礎 (Daily Life) 10%、職場英文 (Workplace) 10%、客戶服務 (Customer Service) 10%。
  * **雅思 (IELTS)**：雅思口說題型 (IELTS Speaking) 45%、日常基礎 (Daily Life) 20%、觀點議論 (Opinion Topics) 20%、旅遊與文化 (Travel / Culture) 10%、工作與學習 (Work / Study) 5%。
  * **多益 (TOEIC)**：職場英文 (Workplace) 35%、商務溝通 (Business Communication) 25%、會議溝通 (Meetings) 15%、客戶服務 (Customer Service) 15%、觀光旅遊 (Travel) 10%。
  * **空服員訓練 (Flight Attendant)**：觀光旅遊 (Travel) 25%、客戶服務 (Customer Service) 25%、機場情境 (Airport) 20%、緊急應變與問題解決 (Emergency / Problem Solving) 15%、日常對話 (Daily Conversation) 15%。
  * **國際商務 (International Business)**：商務溝通 (Business Communication) 30%、業務銷售 (Sales) 20%、會議溝通 (Meetings) 20%、商務談判 (Negotiation) 15%、客戶服務 (Customer Service) 15%。
  * **英語客服 (English Customer Service)**：客戶服務 (Customer Service) 40%、問題解決 (Problem Solving) 20%、禮貌請求 (Polite Requests) 15%、客訴處理 (Complaints) 15%、日常對話 (Daily Conversation) 10%。
- **多目標整合規則 (Multi-Goal Weighting)**：若使用者同時點選多個學習目標，系統會自動合併各目標的主題權重，並將加總後的總權重正規化 (Normalize) 至 100%。

---

## 🚫 3. 語言引導系統與英文優先設計 (Language Guidance & English-First System)

本平台堅持「**English-First (英文優先)**」的核心原則，將「學習內容」與「操作引導」進行明確的系統區分，以達成「**不翻譯英文學習內容，但確保學習者隨時清楚下一步操作**」的產品目標，消除使用疑惑，同時保留母語沉浸感。

---

### A. 三大區分語言系統 (Three Language Subsystems)

系統將介面語言拆分為以下三個獨立系統：

| 系統類型 | 說明與語言規範 | 範例 |
| :--- | :--- | :--- |
| **1. 學習內容**<br>`Learning Content` | **全英文（不翻譯）**。<br>包含字彙、句型、情境對話、口說與聽力問題、AI 生成的操練內容。 | * Landlord (A person who owns a house...)<br>* Tell me about your hometown.<br>* I am looking for an apartment. |
| **2. 導覽語言**<br>`Navigation Language` | **使用學習者偏好語言（預設繁中）**。<br>用於選單、按鈕、狀態指示等介面文字。 | * 今日任務 (Today's Mission)<br>* 下一個任務 (Next Task)<br>* 今日待複習 (Review Due)<br>* 預計達成日期 (Estimated Completion Date) |
| **3. 系統引導語言**<br>`System Guidance` | **使用學習者偏好語言（預設繁中）**。<br>用於系統回饋、操作提示與任務指令。 | * 回答正確！(Correct!)<br>* 再試一次。(Try again.)<br>* 請加入原因。(Give a reason.)<br>* 請改成過去式。(Change to past tense) |

---

### B. 智慧單字輔助系統 (Vocabulary Help System)

當學習者在閱讀或對話中遇到不懂的單字時，系統提供分層的查詢輔助：

1. **第一層（英文釋義 - 預設）**：
   - 提供更簡單的英文定義、例句與相關詞。定義的字彙難度必須低於學習者當前的 CLB/ERS 等級。
   - *範例*：查詢 **utilities**
     > *Definition*: Services you use in your home.
     > *Examples*: water, electricity, internet, gas.
2. **第二層（可選式母語引導）**：
   - 在英文釋義下方，提供不帶直接翻譯的母語情境暗示，引導學習者思考。
   - *範例*：
     > **中文提示**：這是一個與家庭生活服務有關的單字。試著用這個單字造個句子吧！

---

### C. 自適應引導等級 (Adaptive Guidance Levels)

系統會根據學習者的 CLB 等級自動調整引導語言的比例：

* **🟢 初級者 (Beginner: CLB 1-4)**
  - 學習內容：全英文
  - 介面導覽：母語 (繁中)
  - 任務指示與反饋：母語 (繁中)
  - *範例*：`下一步：請改成過去式。` $\rightarrow$ `I am looking for a house.`
* **🟡 中級者 (Intermediate: CLB 5-7)**
  - 學習內容：全英文
  - 介面導覽：母語 (繁中)
  - 任務指示：中英混合模式
  - *範例*：`Next Task（下一個任務）：Add a reason.`
* **🔴 高級者 (Advanced: CLB 8-12)**
  - **全英文沉浸模式 (Full Immersion)**
  - 學習內容、導覽、任務指示、反饋皆為全英文。

---

### D. 使用者語系模式設定 (User Settings)

學習者可隨時在設定中手動切換以下三種引導模式：
- **選項 A（預設）**：英文學習內容 + 母語引導 (English Content + Native Guidance)
- **選項 B**：英文學習內容 + 混合引導 (English Content + Mixed Guidance)
- **選項 C**：全英文沉浸模式 (Full English Immersion)

---

### E. AI 教練生成規範 (AI Coach Rules)

AI 提示詞中心 (AI Prompt Center) 必須約束 AI 模型，嚴格遵守以下對話規範：
* **嚴禁直接翻譯學習內容**。
* **僅在必要時翻譯操作指令（依引導等級而定）**。
* **正確做法**：
  > 引導：`下一步：請改成過去式。`
  > 題目：`I am looking for an apartment.`
* **錯誤做法**：
  > ❌ `請將「我正在找公寓」改成過去式。`（直接將題目內容翻譯成中文）

---

## 🎙 4. 語音優先體驗與教練系統 (Voice-First & Coach System)

系統鼓勵使用者用「口說」完成所有課程，並設計了專屬的互動模式與個性教練。

---

### A. 基礎語音技術支援
- **核心技術**：整合語音轉文字 (STT) 接收使用者回答，並使用 AI 評估發音準確度，搭配 OpenAI Realtime API 進行極低延遲的雙向語音對話。
- **打字選填**：使用者可以完全依靠語音輸入完成所有 Pattern Drills 課程，鍵盤輸入為選填輔助。

---

### B. 跟讀練習模式 (Shadowing Practice Mode)
為建立正確的語感與語調反射，系統設計了獨立的跟讀模組：
1. **跟讀流程**：AI 朗讀範例句子 $\rightarrow$ 學習者複誦跟讀 $\rightarrow$ 系統多維度評估其**發音 (Pronunciation)**、**流暢度 (Fluency)** 與**語速/節奏 (Pace)** $\rightarrow$ 評分後自動銜接至對應句型操練 (Pattern Drill)。
2. **互動範例**：
   - **AI 朗讀**: *"I would recommend taking public transportation."*
   - **學習者跟讀** (系統即時評分語調與語速)
   - **AI 連續提問 (銜接操練)**: *"Good. Why would you recommend it?"*

---

### C. AI 教練個性系統 (Coach Personality System)
平台提供多種 AI 模擬風格，學習者可隨時根據喜好或訓練強度切換教練個性：
* **😊 親切教練 (Friendly Coach)**：溫和且富有耐心地引導，提供大量鼓勵。
* **😠 嚴厲教練 (Strict Coach)**：針對語法細節、反應時間進行嚴格糾正，高標準要求。
* **👔 考官 (Examiner)**：模擬 CELPIP/IELTS 官方口試考官之語速、神態與評分反饋。
* **🎖 CIA 特工教官 (CIA Instructor)**：採用高壓、軍事命令式的快速節奏，挑戰學習者的極限反射速度。
* **🔥 熱血激勵教練 (Motivational Coach)**：充滿熱情、正能量，用高昂的語調與動力鼓勵使用者堅持練習。

---

## 🔄 5. 間隔重複引擎與個人單字庫 (SRS & Vocab Bank)

### A. 自適應間隔重複系統 (Adaptive Spaced Repetition System)

本平台採用**自適應間隔重複演算法**，旨在將學習者的短期記憶轉化為長期的**直覺式英語反射回應**。

#### 1. 預設複習排程 (Default Review Schedule)
當學習者**回答正確且反應速度良好**時，系統採用以下預設複習週期：
* 第 1 天 (Day 1)
* 第 3 天 (Day 3)
* 第 7 天 (Day 7)
* 第 14 天 (Day 14)
* 第 30 天 (Day 30)
* 第 60 天 (Day 60)
* 第 120 天 (Day 120)

#### 2. 強化複習循環規則 (Intensive Review Rules)
若學習者在操練中**答錯、猶豫過久、跳過回答**或**用法錯誤**，該項目將被強制送入強化複習循環：
- **回答錯誤 (Wrong Answer)**：在同一次學習單元 (Session) 中再次複習，並於隔天再次複習。
- **學習者遲疑 (Hesitation)**：在同一次學習單元稍後再次複習，並於 1–3 天內再次複習。
- **重複答錯同一項目 (Multiple Mistakes)**：系統自動縮短該項目的複習間隔，將其狀態標記為「**虛弱 (Weak)**」，並在後續操練中優先加入。
- **回答正確但緩慢 (Correct but Slow)**：將該項目保持在「學習中 (Learning)」狀態，不可晉升至「已掌握 (Mastered)」。
- **回答正確、自然且快速 (Correct, Natural & Quick)**：延長複習間隔，朝 Mastered 狀態推進。

#### 3. 項目狀態與掌握度 (Item Status & Mastery)
- **四種狀態 (Status)**：
  - `New` (新內容)
  - `Learning` (學習中)
  - `Weak` (虛弱 - 答錯多次或反應過慢)
  - `Mastered` (已掌握)
- **掌握度分數 (Mastery Score)**：
  - 分數範圍：`0 – 100` 分
  - 更新依據：準確率 (Accuracy)、反應速度 (Reaction Speed)、自信度 (Confidence)、發音 (Pronunciation) 以及記憶留存率 (Retention)。

#### 4. 複習優先順序 (Review Priority)
在每日操練中，系統會依以下優先級載入內容：
1. 🥇 **虛弱項目 (Weak)** — 優先度最高，進行強化糾錯。
2. 🥈 **到期複習項目 (Due Review)** — 依 SRS 排程到期之項目。
3. 🥉 **全新內容 (New Content)** — 優先度最低。

#### 5. 每日學習配比 (Daily Mix)
根據學習者的當前等級，自動分配每日學習內容：
- **初學者 (Beginner)**：60% 新內容 / 40% 複習
- **中級者 (Intermediate)**：50% 新內容 / 50% 複習
- **高級者 (Advanced)**：30% 新內容 / 70% 複習
- ⚠️ **動態調節機制**：若系統偵測到學習者存在大量「虛弱 (Weak)」項目，系統將**自動降低新內容比例**，增加複習比重，直至虛弱項目被消化。

### B. 個人單字庫 (Personal Vocabulary Bank)
系統會自動收集並追蹤以下單字：
* 未知單字 (Unknown Words) — 使用者點擊查詢的單字。
* 拼寫/用法錯誤單字 (Incorrect Words)。
* 遺忘單字 (Forgotten Words) — 複習時答錯的單字。
* 反應遲疑單字 (Slow Recall Words) — 回答時間過長的單字。

**單字庫儲存欄位**：
- 單字 (Word)、類別 (Category)、熟練度分數 (Mastery Score)、錯誤次數 (Mistake Count)、最後見到時間 (Last Seen)、下次複習時間 (Next Review)、狀態 (Status: New / Learning / Mastered)。

---

## 📊 6. 學習智能與報表分析系統 (Learning Intelligence & Analytics)

本系統藉由核心的**學習智能引擎 (Learning Intelligence Engine)**，深入分析每位學習者的學習特徵、診斷文法語音漏洞、預測未來成長軌跡，並動態指派每週目標，打造高度個性化的訓練體驗。

---

### A. AI 記憶檔案 (AI Memory Profile)
系統不單單記錄學習分數，更在後台建立長期的學習者行為畫像，用以分析使用者的英語輸出特徵與習慣：
* **記錄維度**：學習風格、強勢領域、薄弱領域、偏好主題、反應速度特徵、自信程度、口說輸出習慣（如填充詞使用頻率、句型偏好等）。
* **學習特徵分析範例**：
  - *Fast Speaker / Slow Recall*（口速快但檢索慢：說話流暢度高，但每次切換新句型或被提問時，需花費較長時間思索起始詞）。
  - *Careful Thinker / Slow Response*（思維謹慎但回應慢：極少出文法錯誤，但開口前的遲疑時間偏長，缺乏反射性）。
  - *Strong Vocabulary / Weak Grammar*（詞彙量強但文法弱：能使用高階單字，但主被動、時態等基礎語法經常出錯）。
  - *Strong Fluency / Weak Pronunciation*（流暢度強但發音弱：說話連貫且不結巴，但特定母音或子音的發音存在系統性偏差）。

---

### B. 錯誤模式引擎 (Error Pattern Engine)
系統不僅記錄「哪題答錯」，更深入剖析「**為什麼答錯/答不好**」，為學習者建立專屬的「錯誤模式資料庫 (Error Pattern Database)」：
* **常見錯誤模式診斷項目**：
  - 冠詞遺漏或混淆（如常漏掉 `a`, `an`, `the`）。
  - 過去式與動詞變化遺忘（如在描述過去事件時仍使用原型動詞）。
  - 介係詞使用錯誤或漏失。
  - 刻意迴避長句（傾向使用簡單句，抗拒使用複句）。
  - 因為 (`because`) 等因果關係從句建構失敗。
  - 語序與倒裝句結構錯誤。
  - 開口前習慣性遲疑（即使句子正確，首字遲延仍過長）。

---

### C. 技能拆解引擎 (Skill Breakdown Engine)
拒絕單一模糊的整體分數，系統將學習者的英文能力拆解為多維度技能樹，個別映射至對應的 CLB 等級：
* **能力維度映射範例**：
  - 詞彙量 (Vocabulary)：`CLB 4`
  - 文法掌握 (Grammar)：`CLB 5`
  - 口說表達 (Speaking)：`CLB 6`
  - 聽力理解 (Listening)：`CLB 4`
  - 反應速度 (Reaction Speed)：`CLB 5`
  - 發音評估 (Pronunciation)：`CLB 5`
  - 口語流暢 (Fluency)：`CLB 6`
* **呈現方式**：同時在介面顯示「**綜合等級**」與「**個別技能雷達圖**」。

---

### D. AI 任務生成器 (AI Mission Generator)
系統拒絕使用靜態的死板任務，而是根據學習者的「當前等級、薄弱領域、選定目標、近期表現、以及即將到來的考試日期」每週動態生成任務：
* **任務生成實例**：
  - *偵測到醫療主題薄弱* $\rightarrow$ **指派任務**：完成 50 次醫療 (Healthcare) 情境句型操練。
  - *偵測到口語反應速度偏慢* $\rightarrow$ **指派任務**：完成 20 次快速反應操練 (Rapid Response Drills)。
  - *偵測到思培考試臨近* $\rightarrow$ **指派任務**：完成 10 次 CELPIP 口說模擬任務。
  - *偵測到單字留存率下滑* $\rightarrow$ **指派任務**：複習 30 個標記為 Weak 的單字。

---

### E. 未來預測路線圖與時長模擬 (Future Roadmap & Scenario Simulation)
#### 1. 未來路線預測 (Future Roadmap)
根據學習者當前進度與平均學習效率，提供科學且可信的成長預測：
- 當前等級：`CLB 4.5`
- 當前平均學習時數：`32 分鐘 / 天`
- **預測軌跡**：
  - 30 天後預計達到：`CLB 4.8`
  - 90 天後預計達到：`CLB 5.5`
  - 180 天後預計達到：`CLB 6.3`
  - **預估目標達標日 (CLB 7)**：`2027-07-05`

#### 2. 學習時長場景模擬 (Scenario Simulation)
激勵學習者提高每日投入時間，動態展示時間回報：
- **現狀（每日 30 分鐘）**：預計達標日為 `2027-07-05`
- **若提升至（每日 45 分鐘）**：預計達標日提前至 `2027-05-01`（**省下 65 天**）
- **若提升至（每日 60 分鐘）**：預計達標日提前至 `2027-03-15`（**省下 112 天**）
- 介面將同步計算並呈現：**省下的天數**、**預期進度斜率增幅**以及**學習動力回饋**。

---

### F. 儀表板整合顯示 (Dashboard Integration)
首頁儀表板將無縫整合學習智能引擎的輸出，包含：
1. 當前反射等級 (Current Level) 與目標進度。
2. 未來預測路線圖 (Future Projection)。
3. 當前 AI 學習者畫像 (Learning Profile)。
4. 前三大急需加強的薄弱環節 (Top Weaknesses)。
5. 本週動態指派任務 (Current Mission)。
6. 本週推薦專注訓練領域 (Recommended Focus)。
7. 週度成長變化曲線 (Weekly Growth Trend)。

---

### G. 每週 AI 自省與分析報告 (Weekly AI Reflection)
每週結束時，AI 會生成一份富有人性化的自省評語與報告：
> **本週自省摘要**：
> 「本週您的口頭回答反應速度提升了 12%！特別是在討論『住房 (Housing)』主題時，您顯得更加自信且流暢。
> 本週您進步最多的是『流暢度 (Fluency)』，但『醫療 (Healthcare)』仍是您當前最弱的主題。
> 建議您下週將訓練重心放在『醫療』情境與『快速反應操練 (Rapid Response Drills)』上。」

---

### H. 行事曆系統 (Calendar System)
提供兩種不同的視角：
- **習慣日曆 (Habit Calendar)**：追蹤每日完成情況與連續打卡天數。
- **成長日曆 (Growth Calendar)**：追蹤 ERS 分數軌跡、CLB 等級晉升、字彙量增長與流暢度爬升趨勢。

---

### I. 成就時間軸引擎 (Achievement Timeline Engine)
旨在將學習者的歷史足跡轉換為可視化的「個人成長故事」，讓每一步進步都有跡可循。
* **時間軸分類**：等級進度、字彙量成長、句型掌握度、口說成就、反應速度提升、語音練習時數、任務成就、每週 AI 自省回饋。
* **里程碑範例 (Milestones)**：
  - *等級進度*：完成入學評測、達到 CLB 4 / 5 / 6 / 7。
  - *字彙與操練*：累計掌握 100 / 500 / 1000 個單字；完成 100 / 500 / 1000 次操練。
  - *口說長度*：首次達成 30 秒 / 60 秒 / 2 分鐘的英語口說回應。
  - *語音時數*：累計語音練習達 10 / 50 / 100 小時。

---

## 🏆 7. 遊戲化與留存系統 (Gamification & Retention System)

### 產品目標 (Product Goal)
本平台應同時帶給學習者三種體驗的綜合感受：

* 🦉 **Duolingo** — 輕量、成癮、每日回訪的習慣機制。
* ⚔️ **RPG 角色養成遊戲 (RPG Progression Game)** — 等級、技能樹、世界地圖、王者挑戰的冒險感。
* 🤖 **AI 英語教練 (AI English Coach)** — 個人化、會理解你的智慧訓練。

> 💡 **核心體驗主張**：學習者應感覺自己「**正在一場英語冒險的旅程中前進 (on a journey)**」，而不是「在逐課完成課程 (completing lessons)」。

本系統需最大化以下四項留存指標：
* **每日回訪率 (Daily Return Rate)**
* **學習動力 (Motivation)**
* **長期一致性 (Long-Term Consistency)**
* **目標達成率 (Goal Achievement)**

---

### A. 世界觀設定：CIA 英語學院 (World Setting: CIA English Academy)
學習者在本平台中**不是學生 (students)**，而是**受訓中的特工 (agents in training)**。

* 每位學習者皆從 **菜鳥 (Recruit)** 開始,透過持續訓練逐步晉升軍階。
* 整體敘事框架以「特工養成」包裝所有學習行為,將枯燥的操練轉化為任務 (Mission) 與挑戰 (Challenge)。

---

### B. 雙軌進度系統 (Dual Progression System)
平台必須維護**兩套彼此獨立**的進度系統,以區分「英文真實能力」與「投入與參與度」。

| 系統 | 代表意義 | 衡量指標 | 範例 |
| :--- | :--- | :--- | :--- |
| **語言等級**<br>`Language Level` | 真實英文能力 | ERS / CLB / IELTS / CEFR / TOEIC / TOEFL | `CLB 4.5` |
| **特工等級**<br>`Agent Level` | 活躍度與參與投入 | XP (經驗值) | `Level 18` |

* **獨立性原則**：兩套系統互不綁定。學習者可能是 `CLB 4 / Level 25`(很勤勞但能力剛起步),也可能是 `CLB 7 / Level 10`(底子好但才剛加入)。
* **設計意圖**：即使語言能力尚未提升,高頻投入的學習者仍能透過 Agent Level 獲得即時的成就回饋,維持動力。

---

### C. 軍階晉升 (Agent Ranks)
特工軍階依累積 XP 與里程碑解鎖,共 **8 階**:

1. 菜鳥 (Recruit)
2. 候補特工 (Cadet)
3. 外勤特工 (Field Agent)
4. 資深特工 (Senior Agent)
5. 特別特工 (Special Agent)
6. 訓導導師 (Handler)
7. 首席導師 (Master Handler)
8. 傳奇特工 (Legend Agent)

---

### D. XP 經驗值系統 (XP System)
所有學習行為皆給予 XP 獎勵,驅動 Agent Level 成長:

| 學習行為 (Activity) | XP 獎勵 |
| :--- | :--- |
| 完成一次操練 (Complete Drill) | `+10 XP` |
| 跟讀練習 (Shadowing Practice) | `+20 XP` |
| 語音練習 (Voice Practice) | `+20 XP` |
| 複習虛弱項目 (Review Weak Item) | `+15 XP` |
| 完成每日任務 (Daily Mission) | `+50 XP` |
| 完成每週任務 (Weekly Mission) | `+100 XP` |
| 完成每月任務 (Monthly Mission) | `+300 XP` |
| 突破新的 CLB 等級 (Reach New CLB Level) | `+500 XP` |

---

### E. 每日登入循環 (Daily Login Loop)
學習者每次登入時,儀表板首屏應立即呈現以下資訊,強化「我正在前進」的感受:

* 特工代號 (Agent Name)
* 當前軍階 (Current Rank)
* 當前 CLB (Current CLB)
* 當前 XP (Current XP)
* 連續打卡天數 (Current Streak)
* 今日任務 (Today's Missions)
* 未來目標進度 (Future Goal Progress)

> **登入畫面範例**:
> 特工 Neo (Agent Neo) ｜ 軍階:候補特工 (Cadet)
> 當前:`CLB 4.3` → 目標:`CLB 7`
> 進度:**42%** ｜ 預估抵達:**128 天**

---

### F. 動態任務系統 (Dynamic Missions)
任務全面個人化且**難度自動適配 (Adaptive Difficulty)**,依學習者當前等級、弱點與目標動態生成。任務生成邏輯詳見 [學習智能引擎 §6.D](#d-ai-任務生成器-ai-mission-generator)。

* **每日任務 (Daily Missions)** — 每日重新生成:
  - 完成 20 次住房 (Housing) 操練。
  - 口說練習 10 分鐘。
  - 複習 15 個虛弱單字。
  - 完成 5 次跟讀練習 (Shadowing)。
  - 完成 1 次快速反應訓練 (Rapid Response Session)。
* **每週任務 (Weekly Missions)**:
  - 完成 150 次操練。
  - 本週練習滿 5 天。
  - 徹底掌握 (Mastered) 20 個單字。
  - 反應速度提升 10%。
  - 完成 3 次口說對話 Session。
* **每月任務 (Monthly Missions)**:
  - 將 CLB 提升 0.3。
  - 達成 CLB 5。
  - 累計練習 10 小時。
  - 掌握 100 個單字。
  - 累計獲得 1000 XP。

---

### G. 獎勵系統與每日寶箱 (Reward System & Daily Chest)
完成任務後立即給予獎勵,形成即時回饋。

* **獎勵類型 (Reward Types)**:XP、勳章 (Badges)、成就解鎖 (Achievement Unlocks)、額外複習代幣 (Bonus Review Tokens)、雙倍 XP 加成 (Double XP Boost)、特殊特工頭銜 (Special Agent Titles)。
* **每日獎勵寶箱 (Daily Reward Chest)**:完成當日每日任務後解鎖一個寶箱,隨機掉落以下其一:
  - XP 加成 (XP Bonus)
  - 雙倍 XP (Double XP)
  - 成就勳章 (Achievement Badge)
  - 任務跳過券 (Mission Skip Token)
  - 連續打卡保護券 (Streak Protection Token)
  - 特殊佈景主題解鎖 (Special Theme Unlock)

---

### H. 連續打卡系統 (Streak System)
追蹤連續學習天數,並以里程碑強化堅持動力:`3 / 7 / 30 / 100 / 365` 天連續打卡。

* **連續打卡護盾 (Streak Protection / Streak Shield)**:學習者可透過任務或寶箱獲得護盾,**可抵銷一次中斷的缺席日**,避免長期 Streak 因偶發一日中斷而歸零。

---

### I. 世界地圖系統 (World Map System)
學習路徑不應呈現為冷冰冰的課程清單,而應以**冒險旅程地圖 (Journey Map)** 呈現,完成一個關卡 (Stage) 即解鎖下一關。

> **加拿大旅程 (Canada Journey) 範例**:
> Stage 1 住房 (Housing) → Stage 2 交通 (Transportation) → Stage 3 銀行 (Banking) → Stage 4 醫療 (Healthcare) → Stage 5 政府服務 (Government Services) → Stage 6 職場 (Workplace) → Stage 7 移民面試 (Immigration Interview) → Stage 8 CLB 7 任務 (CLB 7 Mission)

> 💡 不同學習目標(移民、檢定、職場…)對應不同的旅程地圖,關卡內容由主題池權重動態決定。

---

### J. 技能樹系統 (Skill Tree System)
將學習進度以 RPG 技能樹形式視覺化呈現,共 7 條技能線:

* 詞彙 (Vocabulary)
* 文法 (Grammar)
* 流暢度 (Fluency)
* 發音 (Pronunciation)
* 反應速度 (Reaction Speed)
* 聽力 (Listening)
* 自信度 (Confidence)

每條技能線皆具備:**等級 (Levels)**、**XP**、**掌握度百分比 (Mastery %)** 與**視覺化成長進度 (Visual Progression)**。技能等級對應之 CLB 拆解詳見 [技能拆解引擎 §6.C](#c-技能拆解引擎-skill-breakdown-engine)。

---

### K. 王者挑戰系統 (Boss Battle System)
系統每週生成一場重大挑戰,目的在於讓學習者「**在壓力下實際應用所學技能**」。

* **挑戰範例**:CELPIP 模擬考、IELTS 口說挑戰、與房東談判 (Landlord Negotiation)、客訴處理 (Customer Complaint)、機場緊急狀況 (Airport Emergency)、商務會議 (Business Meeting)、移民面試 (Immigration Interview)。
* **互動機制**:AI 扮演情境中的 NPC 角色,學習者必須自然地即時回應,系統依表現給予評分與獎勵。

---

### L. 成就系統與成就時間軸 (Achievement System & Timeline)
* **成就分類 (Categories)**:學習 (Learning)、口說 (Speaking)、詞彙 (Vocabulary)、一致性 (Consistency)、反應速度 (Reaction Speed)、特殊事件 (Special Events)。
* **成就範例 (Achievements)**:
  - 初試身手 (First Mission)、首次語音練習 (First Voice Practice)。
  - 首次掌握 100 / 500 / 1000 個單字。
  - 首次達成 30 秒 / 60 秒英語口說回應。
  - 累計口說 10 / 50 / 100 小時。
  - 達成 CLB 5 / CLB 7 / CLB 9。
* **成就時間軸 (Achievement Timeline)**:將上述成就轉化為「**個人成長故事**」的視覺化時間軸,而**非統計表格**。完整引擎規格詳見 [成就時間軸引擎 §6.I](#i-成就時間軸引擎-achievement-timeline-engine)。
  > **時間軸範例**:
  > `2026/06` 加入 CIA 學院 → `2026/07` 完成首個任務 → `2026/08` 掌握 100 單字 → `2026/10` 達成 CLB 5 → `2027/03` 達成 CLB 7

---

### M. AI 教練頭像 (AI Coach Avatars)
學習者可自由選擇 AI 教練的個性風格,每種頭像採用不同的教學語氣與互動策略:親切教師 (Friendly Teacher)、CIA 特工教官 (CIA Instructor)、嚴厲教練 (Strict Coach)、CELPIP 考官 (CELPIP Examiner)、IELTS 考官 (IELTS Examiner)、熱血激勵教練 (Motivational Coach)、商務導師 (Business Mentor)。完整個性設定詳見 [AI 教練個性系統 §4.C](#c-ai-教練個性系統-coach-personality-system)。

---

### N. 未來預測面板與場景模擬 (Future Projection & Scenario Simulation)
留存系統的儀表板須整合學習智能引擎的成長預測與時長模擬,讓學習者隨時看見「離目標還有多遠」與「多投入能省多少時間」。
* **未來預測面板 (Future Projection Panel)**:今日 `CLB 4.3` → 30 天 `CLB 4.8` → 90 天 `CLB 5.5` → 180 天 `CLB 6.3`;目標 `CLB 7`,預估達標日 `2027-07-05`。
* **場景模擬 (Scenario Simulation)**:每日 30 分鐘 → `2027-07-05`;提升至 45 分鐘 → `2027-05-01`(**省下 65 天**);提升至 60 分鐘 → `2027-03-15`(**省下 112 天**)。

> 此面板與 [未來預測路線圖與時長模擬 §6.E](#e-未來預測路線圖與時長模擬-future-roadmap--scenario-simulation) 共用同一套預測引擎,本節僅為其在遊戲化儀表板中的呈現入口。

---

### O. 社群功能 (Social Features — Phase 2)
> ⚠️ **非 MVP 必要功能**,列為後續 Phase 2 長期規劃。

未來可擴充:好友 (Friends)、學習小組 (Study Groups)、團隊任務 (Team Missions)、排行榜 (Leaderboards)、社群挑戰 (Community Challenges)、推薦邀請任務 (Referral Missions)。

---

### P. 留存核心原則與習慣迴圈 (Retention Principle & Habit Loop)
**每一次登入**都必須觸發以下五個正回饋環節,缺一不可:

1. **任務 (Mission)** — 今天有明確該做的事。
2. **獎勵 (Reward)** — 完成後立即有回饋。
3. **進度 (Progress)** — 看得見自己在前進。
4. **成就 (Achievement)** — 累積值得驕傲的足跡。
5. **未來目標視覺化 (Future Goal Visualization)** — 知道自己離目標更近了。

> 🎯 **唯一情緒目標**:學習者每次離開時都應感覺 ——「**我離目標又更近了一步 (I am getting closer to my goal)**」。

**習慣迴圈 (Habit Loop)**:
```
登入 (Login)
  → 完成任務 (Complete Mission)
  → 獲得 XP (Earn XP)
  → 開啟獎勵寶箱 (Open Reward Chest)
  → 角色升級 (Level Up)
  → 解鎖新內容 (Unlock Content)
  → 查看進度 (View Progress)
  → 明天再回來 (Return Tomorrow)
```

> 最終,學習者應感覺自己是在「**闖關一場英語冒險 (an English adventure)**」,而不是在「**單純地學英文**」。

---

## 📱 8. 前端學習端頁面結構 (Learner App Pages)

學習端 App 包含以下 11 個核心頁面：
1. **儀表板 (Dashboard)** - 學習進度與每日任務入口。
2. **入學評測 (Placement Test)** - 初步能力分級。
3. **每日任務 (Daily Mission)** - 核心句型操練主要流程。
4. **語音教練 (Voice Coach)** - 情境語音對話訓練。
5. **個人單字庫 (Vocabulary Bank)** - 單字卡片複習與查閱。
6. **進度分析 (Progress Analytics)** - 詳細的雷達圖與趨勢分析（含八大維度）。
7. **學習日曆 (Calendar)** - 習慣與成長雙日曆。
8. **每週報告 (Weekly Report)** - 週度學習統計。
9. **每月報告 (Monthly Report)** - 月度成就與目標預測。
10. **目標設定 (Goal Settings)** - 調整每日學習時間、期望檢定分數與目標區域 (Region)。
11. **發音實驗室 (Pronunciation Lab)** - 最小對立對訓練、跟讀與發音挑戰。

---

## ⚙️ 9. 後台管理系統 (Admin CMS)

### A. 基礎規格
- **語系切換 (Bilingual Toggle)**：管理後台支援繁體中文 / 英文雙語切換。
- **管理模組**：
  1. 主題池管理 (Topic Pool Management)
  2. 情境庫管理 (Situation Library Management)
  3. 核心句型庫管理 (Pattern Library Management)
  4. 單字庫管理 (Vocabulary Library Management)
  5. 等級框架與分數換算管理 (Level Framework Management)
  6. 使用者學習分析 (User Analytics)
  7. AI 提示詞中心 (AI Prompt Center)
  8. AI 內容代理人 (AI Content Agent)
  9. 用量與成本監控 (Usage & Cost Monitor) — 依 `usage_log` 呈現每日/每月 API 呼叫、token 消耗與預估花費 (USD)，自用階段不限額但全程可視化。

### B. AI 內容代理人 (AI Content Agent)
- **概念輸入**：管理員可以輸入中文或英文的靈感點子。
  * *範例*：「建立一個加拿大住房的主題」(Create a Canada Housing Topic)、「建立空服員機艙服務的對話場景」(Create Flight Attendant Situations)、「將這篇文章轉換為句型操練」(Convert this article into Pattern Drills)、「生成 CELPIP 口說模擬場景」(Generate CELPIP Speaking Scenarios)。
- **自動生成內容**：AI 會自動產生對應的主題、情境列表、核心句型、相關單字庫，並推薦適合的 CLB 等級與操練類型。
- **審核發布機制**：生成內容**絕不自動儲存與上線**。系統會先將其儲存為「草稿 (Draft)」，待管理員審查修改並手動點擊「核准 (Approve)」後，才會正式發布給學習者使用。

---

## 🧬 10. 進階語言習得引擎 (Advanced Language Acquisition Engine)

> 💡 本引擎是吸收 **FSI 外交語言訓練、情報機構語言訓練 (Intelligence Language Training)、句型操練法 (Pattern Drill)、現代認知科學與間隔重複研究** 後的升級版核心。它讓平台從「教英文」進化為「**訓練學習者用英文思考、反射、自然溝通**」。

平台的使命不只是教會英文,而是讓學習者能夠在真實情境中**自動反應、自然表達、得體溝通**。本引擎將「聽起來像不像在地人、能不能通過 CELPIP、能不能在海外順利工作」這些真正的關鍵能力,拆解為可量測、可訓練的維度。

---

### A. 首要目標:消除翻譯依賴 (Primary Goal — Eliminate Translation)
本引擎的終極目標是讓學習者逐步**移除腦中的母語中介翻譯**:

* **傳統學習者**:`英文 → 母語 → 思考 → 英文`
* **目標狀態**:`英文 → 直覺理解 → 英文回應`

> 系統應在每次互動中持續測量並降低「翻譯依賴度 (Translation Dependency)」,並將其下降趨勢呈現於進度分析與週報中。此目標與 [核心學習理念](./README.md#-核心學習理念-core-learning-philosophy) 一脈相承。

---

### B. 反應速度引擎 (Reaction Speed Engine)
**目的**:量測語言的**自動化反射程度**——學習者是否能不假思索地回應。

* **追蹤指標**:回應延遲 (Response Latency)、思考時間 (Thinking Time)、開口起始速度 (Speaking Initiation Speed)。
* **分級標準**:

| 分級 | 回應時間 |
| :--- | :--- |
| Excellent (優秀) | `< 1.5 秒` |
| Good (良好) | `1.5 – 3 秒` |
| Learning (學習中) | `3 – 6 秒` |
| Weak (虛弱) | `> 6 秒` |
| No Response (無回應) | 未作答 |

* **影響範圍**:反應速度須直接影響 **ERS、CLB 估算、週報、成就里程碑 (如「反射大師」)**。其評分標準與 [通用等級系統 §Reaction Speed Score](./architecture.md#英語反射分數-english-reflex-score---ers) 共用同一套門檻。

---

### C. 發音實驗室 (Pronunciation Lab)
**目的**:訓練**聽辨能力 (Listening Discrimination)** 與**發音準確度 (Pronunciation Accuracy)**。三大模組:

1. **最小對立對訓練 (Minimal Pairs Training)**
2. **跟讀訓練 (Shadowing Training)** — 與 [語音教練 §4.B 跟讀模式](#b-跟讀練習模式-shadowing-practice-mode) 共用模組。
3. **發音挑戰 (Pronunciation Challenges)** — 可作為遊戲化的每週挑戰之一。

#### 最小對立對模組 (Minimal Pairs Module)
透過僅有單一音素差異的字對,訓練學習者區辨易混淆的音:
* 範例:`ship / sheep`、`bed / bad`、`pool / pull`、`walk / work`、`rice / rise`。
* **流程**:學習者聆聽 → 複誦 → AI 評估「聽辨能力、發音準確度、音素混淆模式 (Sound Confusion Patterns)」。

#### 個人化發音檔案 (Personalized Pronunciation Profile)
系統須記錄每位學習者**經常混淆的音對**,建立專屬發音弱點檔案:
* 範例:`ship ↔ sheep`、`r ↔ l`、`v ↔ w`、`th ↔ s`。
* 此檔案餵入 [錯誤模式引擎 §6.B](#b-錯誤模式引擎-error-pattern-engine) 與任務生成器,動態指派針對性發音操練。

---

### D. 頻率引擎 (Frequency Engine)
**目的**:**優先教最有用的語言**——並非所有單字價值相等。

* **必備欄位**:每個單字項目都必須帶有**頻率分數 (Frequency Score)**。
* **頻率分級與學習優先級**:

| 頻率分級 | 學習優先級 | 範例 |
| :--- | :--- | :--- |
| 非常常用 (Very Common) | 最高 | `landlord` |
| 常用 (Common) | 高 | — |
| 不常用 (Uncommon) | 中 | — |
| 罕見 (Rare) | 低 | `photosynthesis` |

> 系統在載入新內容與單字複習時,須以「真實世界溝通實用性」為排序依據,優先讓學習者掌握高頻語言。

---

### E. 自然度引擎 (Naturalness Engine)
**目的**:評估英文「**聽起來自不自然**」——文法正確 ≠ 自然道地。

* **對比範例**:

| 文法正確 (Correct) | 自然道地 (Natural) |
| :--- | :--- |
| *I am chilled.* | *I'm cold.* |
| *Give me water.* | *Could I have some water, please?* |

* **三項獨立分數 (須分開呈現)**:**文法正確度 (Grammar Correctness)**、**自然度 (Naturalness)**、**母語近似度 (Native-Likeness)**。
* **週回饋範例**:
  > 「你的文法很精準,但英文聽起來仍偏正式。試著多用一些自然的口語表達。」

---

### F. 文化校準引擎 (Cultural Calibration Engine)
**目的**:教導**文化上得體的溝通方式**——語言不只是文法,更是行為 (Language is behavior)。

* **區域語言檔案 (Regional Profiles)**:支援 **加拿大 (Canada)、美國 (United States)、英國 (United Kingdom)、澳洲 (Australia)、國際英語 (International English)**。學習者的目標區域記錄於設定,並影響評分與回饋。
* **校準範例**:
  > **學習者**:*Give me water.*
  > **AI**:這句文法正確,但加拿大人通常會說:*Could I have some water, please?*

  > **學習者**:*I disagree.*
  > **AI**:在職場溝通中,通常偏好較委婉的回應,例如:*I see your point, but I have a slightly different perspective.*

---

### G. 溝通風格引擎 (Communication Style Engine)
**追蹤六大溝通風格維度**:禮貌度 (Politeness)、直接度 (Directness)、自信度 (Confidence)、專業度 (Professionalism)、友善度 (Friendliness)、同理心 (Empathy)。

* 系統依此生成個人化回饋。範例:
  > 「你的英文很流利,但在加拿大職場情境中,你的回應可能顯得**過於直接**。」

---

### H. 英語反射發展模型 (English Reflex Development Model)
平台須以**八大維度**綜合評估學習者的進步,取代單一模糊分數:

1. 詞彙 (Vocabulary)
2. 文法 (Grammar)
3. 流暢度 (Fluency)
4. 發音 (Pronunciation)
5. 反應速度 (Reaction Speed)
6. **自然度 (Naturalness)** 🆕
7. **溝通風格 (Communication Style)** 🆕
8. **記憶留存 (Retention)** 🆕

> 這八大維度以 **ERS 八維加權公式**(權重總和 1.00)共同計算反射分數,並影響 **CLB 估算、未來預測、週報、任務生成**。其中第 6–8 維為本引擎新增。完整權重表詳見 [通用等級系統 §英語反射分數 ERS](./architecture.md#英語反射分數-english-reflex-score---ers)。

---

### I. 每週 AI 教練自省擴充 (Enhanced Weekly AI Reflection)
[每週 AI 自省 §6.G](#g-每週-ai-自省與分析報告-weekly-ai-reflection) 除了強弱項外,須額外納入本引擎的新維度——**反應速度、自然度、發音、溝通風格**:
> 「你的反應速度提升了 15%。
> 你的發音準確度提升了 8%。
> 你的回應越來越自然了。
> 但你在加拿大職場的溝通風格仍有待加強。」

---

### J. 長期產品願景 (Long-Term Product Vision)
本平台的目標**不是培養「懂英文」的學習者**,而是培養能夠做到以下的學習者:

* 用英文思考 (Think in English)
* 自動反射回應 (Respond automatically)
* 自然地表達 (Speak naturally)
* 得體地溝通 (Communicate appropriately)
* 在真實情境中自信運作,且**腦中無需翻譯** (Operate confidently without translating)

> 🎯 加入本引擎後,產品正式從「**英文學習平台**」升級為「**English Reflex Coach + AI Language Acquisition System**」。核心不再只是單字、文法、考試,而是 **反應速度、自然度、文化校準、溝通風格** ——這些才是真正決定一個人能否聽起來像在地人、通過 CELPIP、在海外順利工作的關鍵能力。
