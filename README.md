# 提示站 Prompt Studio

把「填一堆欄位 → 吐出一坨文字」變成**看得見因果**的提示詞工作台。

兩條產品線：**做卡**（TCG 卡牌）與**做章**（徽章 / 實體工藝品）。

---

## 核心概念

### 1. 三向連動 —— 欄位 ↔ 卡面位置 ↔ 提示詞片段

滑過左邊任何一個欄位，中間卡面示意圖上**對應的區塊**會亮起來，同時右邊提示詞裡**對應的那段文字**也會亮起來。反過來也成立：點提示詞裡的某一段，會跳回產生它的欄位。

點一下可以**釘選**，高亮不會隨滑鼠移開而消失，方便邊對照邊改。

> 中間那張圖是**版面對照示意圖，不是成品預覽**。
> 實測下來，用 HTML/CSS 模擬印刷卡面的結果比不上「把好的提示詞丟給生圖模型」，
> 所以這裡不做 CSS 擬真渲染 —— 成品一律交給 AI。
> 需要對照真卡時，可用「參考底圖」上傳自己的圖（只存在瀏覽器，不會上傳）。

### 2. 影響力標示

每個欄位都標了 `決定性` / `明顯` / `微調`，並照影響力排序，避免在不重要的格子上糾結。

### 3. 鎖定 or 交給 AI

每個可代填的欄位都能一鍵切換：

- 🔒 **鎖定** —— 用你填的內容（角色名、動作這種要精準的）
- ✨ **AI 代填** —— 提示詞會改寫成「請模型自己想一個」（招式名、風味文字、圖鑑描述這種）

### 4. 兩條出口

- **自備 API Key 直接出圖**：OpenAI / Google Gemini·Imagen / Stability AI
- **只要提示詞**：自然語言 / 結構化 JSON / 負面提示，複製走拿去 Midjourney、即夢等任何工具
- **零門檻**：Pollinations（FLUX）免金鑰，不用註冊就能先試構圖

---

## 支援的卡牌系統

| 系統 | 卡面特點 | 專屬欄位 |
|---|---|---|
| **Pokémon** | 63×88mm，橫幅插圖窗 | 屬性（11 種，決定光效主色）、階段、HP、特性、雙招式、弱點/抵抗/撤退、稀有度與箔面 |
| **One Piece** | 63×88mm，**滿版插圖** | 卡色（6 色）、費用、力量、反擊、特徵、Trigger、霸氣特效 |
| **Yu-Gi-Oh!** | 59×86mm，**正方形插圖窗** | 卡框類型（9 種）、屬性、星數、種族類型、召喚特效、ATK/DEF |

每個系統都有自己的美術風格庫（例如寶可夢的「90 年代杉森建水彩」vs 遊戲王的「浮世繪」），選項都附一句「選了會怎樣」。

---

## 開發

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

Next.js 14 (App Router) + TypeScript + Tailwind。沒有資料庫，沒有後端狀態。

### 部署到 Vercel

Import 這個 repo，不需要設定任何環境變數就能跑（Pollinations 免金鑰）。
使用者自己的 API Key 由前端帶入，**不需要也不應該**設成伺服器環境變數。

---

## 安全性

- 所有輸入內容與 API Key 只存在使用者瀏覽器的 `localStorage`
- 出圖請求經由 `/api/generate` 代理轉給供應商，Key **用完即丟**：不寫檔、不入庫、不記 log、不回傳
- 參考底圖在瀏覽器以 data URL 處理，不會上傳

---

## 專案結構

```
app/
  page.tsx                 首頁（做卡 / 做章 入口）
  card/page.tsx            做卡工作台
  api/generate/route.ts    生圖代理（4 家供應商）
components/studio/
  HighlightContext.tsx     三向連動的狀態中樞
  FieldPanel.tsx           左欄：分組欄位、影響力標示、AI 代填開關
  CardAnatomy.tsx          中欄：SVG 卡面解剖圖 + 參考底圖
  PromptPanel.tsx          右欄：分段高亮的提示詞輸出
  ResultPanel.tsx          出圖結果與下載
  SettingsModal.tsx        供應商與 API Key
lib/card/
  types.ts                 欄位 / 區塊 / 片段的型別定義
  builder.ts               PromptWriter、JsonWriter、AI 代填解析
  systems/{pokemon,onepiece,yugioh}.ts
lib/providers.ts           供應商與模型清單
legacy/                    原本的三個單檔 HTML 工具（保留參考）
```

### 要新增一個卡牌系統？

只要在 `lib/card/systems/` 加一個檔案，匯出 `CardSystem`（`zones` + `fields` + `build`），
再登記到 `lib/card/index.ts`。UI 完全由 schema 驅動，不用改任何元件。

---

## 舊版工具

原本的三個單檔 HTML 保留在 `legacy/`：

- `tcg-json-prompt-master.html` —— 做卡的前身
- `badge-craft-designer.html` —— 做章的前身（下一階段要搬進來）
- `pokegen-switch-ui.html` —— Switch 圖鑑 UI 生成器（支線實驗）
