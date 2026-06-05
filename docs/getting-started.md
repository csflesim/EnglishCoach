# 快速上手 (Getting Started)

本指南將指引您如何在本地端設定並啟動 **English Reflex Coach** 專案。

## 📋 必備條件 (Prerequisites)

在開始之前，請確保您的開發環境已安裝以下工具與帳戶：

- **Node.js**: 建議版本為 `v18.x` 或以上 (LTS 版本)
- **套件管理器**: `npm`、`yarn` 或 `pnpm`
- **Supabase 帳戶**: 用於資料庫與身分驗證
- **OpenAI API 金鑰**: **可選**。只用於 AI 評分(STT + 評分);不填則自動以免費模式運行(瀏覽器 TTS + 反應速度)。複製 `.env.local.example` 為 `.env.local` 填入 `OPENAI_API_KEY`,重啟即啟用。

---

## 🚀 安裝與設定步驟

### 1. 複製專案 (Clone Repository)

```bash
git clone <your-repository-url>
cd english-reflex-coach
```

### 2. 安裝依賴套件 (Install Dependencies)

在專案根目錄下執行以下指令安裝所需套件：

```bash
npm install
# 或者使用 yarn/pnpm
# yarn install
# pnpm install
```

### 3. 設定環境變數 (Environment Variables)

複製環境變數範本並填入您的金鑰資訊：

```bash
cp .env.example .env.local
```

打開 `.env.local` 檔案，填入以下必要設定：

```env
# 伺服器埠號
PORT=3000

# Supabase 連線資訊
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI API 設定 (STT + 回應評分)
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. 啟動開發伺服器 (Run Development Server)

執行以下指令啟動本地端開發伺服器：

```bash
npm run dev
```

啟動後，您可以在瀏覽器中開啟 [http://localhost:3000](http://localhost:3000) 檢視應用程式。

---

## 📦 部署與建置 (Build & Deployment)

本專案使用 **Vercel** 進行部署。若要建立本地生產環境的建置版本：

```bash
npm run build
```

建置完成後，可使用以下指令在本機運行生產版本以進行測試：

```bash
npm run start
```
