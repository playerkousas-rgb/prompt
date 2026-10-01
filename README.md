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
> 每套系統都內建 AI 生成的範例卡當底圖（AVIF，四張合計 432 KB），
> 主角統一是**貝登堡（Baden-Powell，童軍運動創辦人）**，
> 而且是**用 test1 的經典 JSON 格式生成的**，不是另外寫的描述。
> 寶可夢有「雙人聯動 / 單人」兩版可切換，示範同一張卡在不同構圖與場景下的樣子。
> 可用濃度滑桿調整，或「換底圖」上傳自己的參考卡圖（只存在瀏覽器，不會上傳）。

### 2. 簡易 / 進階兩種模式

預設是**簡易模式**：整個左欄只問 9 格（主角、名字、動作、地點、畫風、屬性、輸出形式、稀有度、要不要附圖），
其餘幾十格一律使用實測過的預設值。覺得不夠細再按右上角切到**進階**，所有欄位才會展開。

### 3. 每一格都講清楚「它控制什麼」

每個欄位底下都有兩行固定資訊：

- **卡面位置** —— 這格會動到卡面的哪一塊（由 `zones` 推出來，不是手寫的）
- **說明** —— 改了會怎樣

卡面對照圖下方還有一塊「這一塊由哪些欄位控制」，滑到任何一塊框就會列出**該區塊的全部欄位**並可直接點過去。
欄位與區塊的對應有涵蓋率檢查（`uncoveredFields()`）：目前三套系統**沒有任何一格沒被認領**。

### 4. 影響力標示

每個欄位都標了 `決定性` / `明顯` / `微調`，並照影響力排序，避免在不重要的格子上糾結。

### 5. 附自己的照片 / 寵物照（圖生圖）

「要不要附參考圖」這一格選了人物 / 寵物 / 物件之後：

- 左欄會多出一塊**上傳區**（圖片只留在瀏覽器分頁的記憶體，不寫 localStorage、不進我們的伺服器）
- 提示詞會自動長出一個 `reference_image` 區塊：身分鎖定（人看臉、寵物看花色斑紋）、
  一定要保留的特徵、要多像照片（風格化 / 忠實 / 鬆散）、以及「不要變成拼貼、不要換品種」的禁止事項
- `character_details.hair / clothing` 會切成 `Please refer to the first image I uploaded.`（人物照才有 hair）
- 右欄會提醒：複製提示詞到別的工具時，**照片要放第一張**
- 直接在站上出圖時，只有 **Gemini `gemini-2.5-flash-image`** 會真的把照片一起送出去；
  其他供應商只吃文字，UI 會明講並建議你改用會讀圖的工具

### 6. 輸出格式的底：test1 原版

`test1` (`tcg-json-prompt-master.html`) 的 JSON 完成度很高，所以 `lib/card/classic.ts`
就是它的移植：鍵的順序、各屬性的中文背景字典、所有預設值、以及
`hair` / `clothing` 的 `"Please refer to the first image I uploaded."`（圖生圖用語）都沿用。

在這個底上，只做了**加法**（畫風細項、`reference_image`、`output_target`、`negative_prompt`）
與**一處減法**（後期卡面已不存在的「分類 / 身高體重」）。

**唯一一處刻意的行為調整（場景可變 + 有寵物／無寵物）**

test1 在三套系統都把 `background.setting` 寫死（寶可夢固定是「高強度雙人聯動戰鬥場景」），
不管使用者在 Setting 欄填什麼。現在改成：

| 情況 | 輸出 |
|---|---|
| Setting 留空 | 完全沿用 test1 的寫死值，輸出與 test1 **逐字相同** |
| Setting 有填 | 用你填的場景 |
| 主角類型＝訓練家、且夥伴欄位留空 | 進入**單人模式**：拿掉 `partner_pokemon` 區塊，卡名改「單人版」，招式與特性的預設描述也改成單人說法 |
| 其他情況 | 維持 test1 的雙人聯動寫法 |

**已移除：分類 / 身高體重**

後期的寶可夢卡（ex / V / SAR 這些）插圖下方那條「分類・身高・體重」細帶已經沒有了，
留著只會讓 AI 多畫一條用不到的資訊帶，所以欄位、卡面區塊與 `frame_structure` 的那一條敘述一併拿掉。

**第二處刻意的加料（`frame_structure`，只加不改）**

test1 的 `ui_elements` 給的是**內容**（招式叫什麼、幾點傷害），沒有講**版面長什麼樣**，
所以圖像 AI 常常把能量消耗寫成「火無」兩個字，而不是畫成圓形屬性符號。
現在在 `card_layout` 裡、`ui_elements` **前面**多塞一個同層的 `frame_structure` 陣列，
專門描述每一列的排法（消耗在左 / 招式名置中 / 傷害靠右對齊、關鍵字做成藥丸徽章、繁中要寫對…）。

| 系統 | 有沒有 `frame_structure` |
|---|---|
| 寶可夢 | ✅ 9 條（重點：能量消耗**必須畫成圓形符號**、每招一整列） |
| 海賊王 | ✅ 9 條（重點：圓形費用泡泡、左側直排反擊值、【登場時】做成彩色藥丸、效果文字寧短勿擠） |
| 遊戲王 | ❌ 不加（test1 原本的寫法就夠好，保持原樣） |

> `ui_elements` 本身一個字都沒動，所以 test1 原有的輸出全部還在，只是多了一組版面指示。

### 7. 鎖定 or 交給 AI

每個可代填的欄位都能一鍵切換：

- 🔒 **鎖定** —— 用你填的內容（角色名、動作這種要精準的）
- ✨ **AI 代填** —— 提示詞會改寫成「請模型自己想一個」（招式名、風味文字、圖鑑描述這種）

### 8. 只有一份提示詞

以前右欄有四個分頁（經典 JSON / 自然語言 / 結構化 JSON / 負面提示），實際上沒人知道該挑哪一個。
現在**只輸出一份**——實測最穩的那份 JSON，一顆「複製提示詞」按鈕，整段貼到
ChatGPT、Gemini、即夢、Midjourney 都能用。

原本散在其他分頁的東西全部併進這一份：

| 原本在哪 | 現在在哪 |
|---|---|
| 結構化 JSON 的畫風 / 鏡頭 / 光線 / 線稿 / 細節密度 | `art_style.direction / camera / lighting / linework / detail_density` |
| 稀有度 / 箔面 / 卡框（原本另有一個重複的「經典格式工藝」下拉，已刪） | `visual_effects.finish / foil / border` |
| 「只要插圖 / 整張卡 / 情境照」 | 頂層 `output_target` |
| 負面提示分頁 | 頂層 `negative_prompt` |

出圖按鈕送出的就是這一份，不會再有「我看的跟送出的不一樣」的問題。
**零門檻**：Pollinations（FLUX）免金鑰，不用註冊就能先試構圖。

---

## 支援的卡牌系統

| 系統 | 卡面特點 | 專屬欄位 |
|---|---|---|
| **Pokémon** | 63×88mm，橫幅插圖窗 | 屬性（決定光效主色）、階段、HP、特性、雙招式、弱點/抵抗/撤退、稀有度與箔面 |
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
- 參考底圖與你上傳的參考照片都在瀏覽器以 data URL 處理；照片只有在你按下「生成圖片」
  且選了會讀圖的模型時，才隨那一次請求轉給供應商，伺服器不留存

---

## 專案結構

```
app/
  page.tsx                 首頁（做卡 / 做章 入口）
  card/page.tsx            做卡工作台
  api/generate/route.ts    生圖代理（4 家供應商）
components/studio/
  HighlightContext.tsx     三向連動的狀態中樞
  FieldPanel.tsx           左欄：簡易/進階欄位、卡面位置標示、AI 代填開關
  ReferenceUpload.tsx      左欄：參考照片上傳（只存在記憶體）
  CardAnatomy.tsx          中欄：SVG 卡面解剖圖 + 參考底圖
  PromptPanel.tsx          右欄：唯一一份提示詞（分段高亮 + 一鍵複製）
  ResultPanel.tsx          出圖結果與下載
  SettingsModal.tsx        供應商與 API Key
public/base/                 四張 AVIF 貝登堡底圖（pokemon-duo / pokemon-solo / onepiece / yugioh）
lib/card/
  classic.ts               唯一的輸出格式（test1 原版骨架 + 畫風/工藝/參考圖/負面提示）
  reference.ts             參考圖（人 / 寵物 / 物件）的欄位與身分鎖定指示
  types.ts                 欄位 / 區塊 / 片段的型別定義
  builder.ts               PromptWriter、JsonWriter、AI 代填解析
  systems/{pokemon,onepiece,yugioh}.ts
lib/providers.ts           供應商與模型清單
legacy/                    原本的三個單檔 HTML 工具（保留參考）
```

### 要新增一張底圖 / 一種場景？

在該系統的 `baseImages` 陣列加一筆 `{ id, label, desc, src }` 就會自動多一顆切換鈕，
UI 不用改。底圖請一律轉 AVIF（`convert in.png -resize 756x1064 -quality 52 out.avif`），
一張約 90–130 KB。

### 要新增一個卡牌系統？

只要在 `lib/card/systems/` 加一個檔案，匯出 `CardSystem`（`zones` + `fields` + `build`），
再登記到 `lib/card/index.ts`。UI 完全由 schema 驅動，不用改任何元件。

---

## 舊版工具

原本的三個單檔 HTML 保留在 `legacy/`：

- `tcg-json-prompt-master.html` —— 做卡的前身
- `badge-craft-designer.html` —— 做章的前身（下一階段要搬進來）
- `pokegen-switch-ui.html` —— Switch 圖鑑 UI 生成器（支線實驗）

> `tcg-json-prompt-master.html` 的 JSON 輸出並未被取代 —— 它是 `lib/card/classic.ts` 的骨架，
> 也就是現在唯一那份輸出的底。原有的鍵、字典與固定字串都還在，差別只是多了
> `reference_image`、`art_style` 的畫風細項、`output_target` 與 `negative_prompt`，
> 以及拿掉了後期卡面已不存在的「分類 / 身高體重」。
