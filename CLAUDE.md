# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

這是一個 Google Apps Script 專案，為資訊系新鮮人成長營 114 建立老師推薦系統。學生透過網頁表單填寫夢想，系統會整合 OpenAI API 和師資清單，推薦適合的老師並記錄到 Google 試算表。

## 核心架構

### 主要檔案
- `Code.gs` - 主要後端邏輯，處理表單提交、OpenAI API 整合、試算表寫入
- `form.html` - 響應式前端表單，支援手機版本
- `faculty_list.gs` - 師資清單常數，供 AI 推薦參考
- `appsscript.json` - GAS 專案配置，定義權限和執行環境
- `faculty_list.md` - 完整師資清單原始資料

### 系統流程
1. 學生在 `form.html` 填寫班級、學號、姓名和夢想
2. `Code.gs` 中的 `handleForm()` 接收資料
3. 結合夢想內容和師資清單建立 prompt
4. 呼叫 OpenAI API (gpt-4o-mini) 進行推薦
5. 解析 JSON 回應取得老師姓名和推薦原因
6. 寫入 Google 試算表並回傳結果給前端

## 開發指令

### 部署和管理
```bash
# 登入 Google Apps Script
clasp login

# 推送程式碼到雲端
clasp push

# 在網頁編輯器中開啟專案
clasp open
```

### Script Properties 設定
系統需要在 GAS 專案中設定以下 Script Properties：
- `SHEET_ID` - Google 試算表 ID
- `OPENAI_API_KEY` - OpenAI API 金鑰

## 重要技術細節

### API 整合
- 使用 OpenAI gpt-4o-mini 模型
- 設定 temperature: 0.2 確保穩定輸出
- 回應格式：`{"teacherName": "老師姓名", "reason": "推薦原因"}`

### 權限配置
需要以下 OAuth scopes（在 appsscript.json 中）：
- `https://www.googleapis.com/auth/spreadsheets` - 試算表讀寫
- `https://www.googleapis.com/auth/forms` - 表單存取
- `https://www.googleapis.com/auth/script.external_request` - 外部 API 呼叫

### 錯誤處理
- 前端驗證必填欄位
- 後端檢查 Script Properties 存在性
- OpenAI API 錯誤捕捉和解析
- JSON 解析失敗的備用處理

### 響應式設計
- 使用 CSS Grid 和 Flexbox
- 支援 iOS Safari 和 Android Chrome
- 流體字級 (clamp) 和安全區域適配
- 避免 iOS 自動縮放的字體大小設定

## 部署注意事項

1. 確保 Google 試算表已建立並取得正確的 SHEET_ID
2. 設定有效的 OpenAI API 金鑰
3. Web 應用程式需設定為「任何人都可存取」
4. 時區設定為 Asia/Taipei