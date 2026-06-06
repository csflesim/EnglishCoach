# 規格 vs 實作落差分析 (Gap Analysis)

> 比對 `features.md` / `architecture.md`(規格)與目前實作(`changelog.md`)。最後更新:2026-06-06。
> 分三類:**❌ 文檔有、未做**、**🔄 已做但與文檔不同(文檔過時)**、**➕ 已做、文檔沒寫**。

---

## ❌ 文檔有寫、目前「沒做」的

| 項目 | 文檔位置 | 現況 | 備註 |
| :--- | :--- | :--- | :--- |
| **擴展操練 Expansion** | features「擴展操練」、architecture「Session 流程」 | **未實作**。`availableModes` 只回 替換 + 轉換;`buildSession` 無 expansion 分支;DB expansion 列為空 | 規格寫「每次抽 5 條擴展鏈、逐層加長」,UI 與引擎都還沒做 |
| **自由發揮模式 Free Practice** | features「自由發揮模式」 | **未實作**。沒有「回合後 3 題自由造句」也沒有主頁入口 | 需 AI 評分;可在背景評分架構上後補 |
| **AI 補詞 `/api/suggest-words`** | features「AI 詞庫補充」、architecture | **未實作此端點** | 改以「離線平行分類 9393 字 + `/api/check-frame` 選詞過濾」達成詞庫品質,方向不同 |
| **情境反應 Response** | features(標示已關閉) | **刻意關閉**(部分單元有資料) | 與文檔一致,非缺漏 |
| **單字 `usedCount` / 來源標記顯示** | features「單字使用追蹤」 | **部分**:熟悉度/弱由 `review_items` 追蹤;但「使用次數、seed/ai/user 來源」未在 UI 呈現 | SRS 已涵蓋核心需求 |
| **登入 / `users_profile` / 多人** | architecture「規劃中」 | **未做**(單人、匿名 RLS) | 與「刻意不做」一致 |
| **`attempts` 表** | architecture「規劃中」 | 改用 `practice_sessions` + `review_events` + `error_log` | 等價需求已用其他表滿足 |

---

## 🔄 已做、但與文檔描述「不同」(文檔過時,以 changelog 為準)

| 項目 | 文檔說法(舊) | 實際做法(新) |
| :--- | :--- | :--- |
| **AI 評分流程** | 「每發說完 → STT + 評分 → 顯示糾錯**再播正解**」(阻塞、逐發) | **背景非阻塞**:練習中不顯示對錯、唸完即下一發;**整輪結束一次評分**(`/api/session-review`) |
| **辨識來源** | 只提 Whisper STT | 主力為**瀏覽器 Web Speech(免費)**,文字餵給 AI;Whisper 為後備 |
| **評分回傳** | `weakness` 單一標籤 | `errors[]` 多重**錯誤分類** + 寫入 `error_log` |
| **掌握判定** | 「一課所有可用模式都做過 → 掌握」(粗) | **細粒度階層**:人稱 → 句框 → 模式 → 單元(轉換需 6×4) |
| **進度儲存** | `kv.progress`(jsonb) | 獨立 `progress` 表(lesson_id, drill_type 細粒度 key) |
| **弱點頁** | 「目前為 **mock 假資料**」 | **真實**:`/analysis` 由 `review_items` + `error_log` + `practice_sessions` 驅動 |
| **轉換答案生成** | `enFrom→enTo` 字串轉換、`transformFrame` 設定 | **變位引擎** `renderSentence`(6 人稱 × 5 op),非字串對應表 |
| **資料表結構** | kv / wordbooks(words jsonb)/ pattern_vocab… | 已演進為 `vocabulary`(categories[]/pos/slots/difficulty/wordbooks[]/box)、`review_items`、`bad_combos` 等(見 changelog §10) |
| **本地比對** | 文檔未區分「免費判分」 | 新增 ✅ **本地比對**(縮寫等價)免費判對錯 |

---

## ➕ 已做、文檔「沒寫」的(新增能力)

- **6 人稱變位引擎** + 轉換選人稱/操作。
- **文法形態自動修正**:數的一致(They are men)、冠詞 a/an。
- **間隔複習 SRS**(艾賓豪斯 + 萊特納 box、drill gap、box 鏡像)。
- **三模式評分並存**(即時辨識 / 本地比對 / 背景 AI)+ 整輪 AI 分析。
- **AI 選詞過濾 bad_combos**(判過快取、後台還原)+ 語法槽位 slot 選詞。
- **錯誤分類 `error_log`** + 常錯結構統計。
- **⚙ 設定面板**(8 開關 + 說明 + 記憶)。
- **真實月曆**打卡。
- **詞本後台**(分頁/搜尋/選用/ALL 詞本)+ 9393 字離線分類(slots/difficulty/CELPIP/IELTS)。
- **反應時間 = 開口時刻**修正(iOS 相容)。

---

## 建議的後續(若要補齊文檔規格)
1. **擴展操練 Expansion**:在 `buildSession` 加 expansion 分支 + `availableModes` 放行 + 第二層 UI。
2. **自由發揮模式**:沿用背景評分架構,回合後 3 題 / 主頁入口。
3. **同步文檔**:把 `features.md` / `architecture.md` 標為「願景/早期規格」,日常以 `changelog.md` + 本檔為準(已於兩檔頂部加指引)。
