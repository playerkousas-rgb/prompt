// ---------------------------------------------------------------------------
// 巾圈有哪些種類
//
// 查完一輪（Gilwell / BSA slide-of-the-month / 台港團本部做法 / Etsy 與工廠目錄）
// 之後的結論：**真正要先分的不是材質，是「構造」** —— 構造決定了
//   · 有沒有一個可以放圖的「正面」
//   · 要不要問編法
//   · 字能刻多小、圖能多細
//   · 生圖時該從什麼角度拍
//
// 構造只有五種：
//   knot     繩結環    —— 繩子編成一個圈，沒有正面，看的是編法與配色
//   solid    實心環    —— 木 / 樹脂 / 3D 列印 / PVC，環身本身就是一塊面
//   plate    平片滑扣  —— 一片皮或金屬，領巾從孔或背後的環穿過，正面是一張小海報
//   figurine 立體造型  —— 一隻公仔 / 一個物件，背後黏一截短管
//   fabric   布面環    —— 繡片或織帶縫成筒狀
// ---------------------------------------------------------------------------

export type WoggleFamily = 'knot' | 'solid' | 'plate' | 'figurine' | 'fabric';

export interface WoggleTypeDef {
  value: string;
  label: string;
  swatch: string;
  desc: string;
  family: WoggleFamily;
  /** 有沒有一個夠大、可以放圖案的正面 */
  hasFace: boolean;
  /** 要不要問「編法」 */
  needsWeave: boolean;
  /** 這個做法可讀的最小字高（mm）—— 巾圈的面很小，這一條很致命 */
  minTextMm: number;
  /** 預設材料顏色，換類型時用得上 */
  material: string;
  /** 構造的英文描述（寫進 form.construction） */
  keywords: string;
  /** 這個類型最適合的拍法 */
  shot: string;
  /** 做法上的提醒（中文，顯示在對照圖下方） */
  note: string;
  /** 手工做的（不是交給工廠量產的款式） */
  handmade?: boolean;
  /** 規格單上這款要填的尺寸怎麼寫 */
  sizeSpec: (inner: string, height: string, face: string) => string;
  /** 工廠端的開模 / 製版方式 */
  tooling: string;
}

export const WOGGLE_TYPES: WoggleTypeDef[] = [
  {
    value: 'knot_leather',
    label: '皮繩土耳其頭結',
    swatch: '#8b5e3c',
    desc: '極偉（Gilwell）原型：兩圈皮繩編的土耳其頭結，木章領袖最常見',
    family: 'knot',
    hasFace: false,
    needsWeave: true,
    minTextMm: 0,
    material: '深棕圓皮繩 3–4 mm',
    keywords:
      "a Turk's head knot woggle woven from round leather cord, continuous over-under braid forming a ring, no flat face",
    shot: 'three-quarter view showing the braid structure clearly',
    handmade: true,
    sizeSpec: (i, h) => `內徑 ${i} mm × 高 ${h} mm`,
    tooling: '手工編織，無開模',
    note: '繩結類沒有「正面圖案」可言 —— 它的設計就是編法與配色，想放團徽要另外穿金屬牌。',
  },
  {
    value: 'knot_paracord',
    label: '傘繩編結（550 Paracord）',
    swatch: '#f97316',
    desc: '最便宜好做，雙色螺旋最漂亮，小隊配色一人一個',
    family: 'knot',
    hasFace: false,
    needsWeave: true,
    minTextMm: 0,
    material: '深綠＋金黃 雙色 550 傘繩',
    keywords:
      "a Turk's head knot woggle woven from 550 paracord, tight glossy nylon braid, two colours spiralling through the weave",
    shot: 'three-quarter view, close enough to count the cord passes',
    handmade: true,
    sizeSpec: (i, h) => `內徑 ${i} mm × 高 ${h} mm`,
    tooling: '手工編織，無開模',
    note: '雙色要指定「哪一色走外圈」，不然 AI 會畫成隨機混色。',
  },
  {
    value: 'knot_strap',
    label: '打包帶編織',
    swatch: '#eab308',
    desc: '台灣團常用的環保做法：七瓣三層土耳其頭結，一條約 70 cm',
    family: 'knot',
    hasFace: false,
    needsWeave: true,
    minTextMm: 0,
    material: '9 mm 寬打包帶，單色或雙色',
    keywords:
      'a woggle woven from flat plastic packing strap, wide glossy flat bands crossing over and under, seven-bight three-pass ring',
    shot: 'three-quarter view, flat bands catching the light',
    handmade: true,
    sizeSpec: (i, h) => `內徑 ${i} mm × 高 ${h} mm`,
    tooling: '手工編織，無開模',
    note: '扁帶跟圓繩的編法長得完全不一樣，提示詞一定要寫 flat bands，不然 AI 會畫成圓繩。',
  },
  {
    value: 'leather_plate',
    label: '皮片滑扣（二孔 / 三孔 / 壓扣）',
    swatch: '#a16207',
    desc: '一片植鞣皮打孔或上壓扣，正面可壓印圖案與名字 —— 最好客製的一種',
    family: 'plate',
    hasFace: true,
    needsWeave: false,
    minTextMm: 3,
    material: '原色植鞣皮，邊緣染深棕',
    keywords:
      'a flat vegetable-tanned leather neckerchief slide, the neckerchief passing through two punched slots, tooled and stamped relief on the front face',
    shot: 'straight-on front view of the leather face, slight angle to show thickness',
    sizeSpec: (i, h, f) => `正面 ${f} mm，皮厚 2.5–3 mm，穿孔內徑 ${i} mm`,
    tooling: '壓印鋼模（一次性模費），或雷雕免開模',
    note: '皮革壓印最小可讀字高約 3 mm；字太多會糊，名字 + 團號兩行就是上限。',
  },
  {
    value: 'wood',
    label: '木 / 竹（車環或雷雕）',
    swatch: '#92400e',
    desc: '原木環或木片雕刻，木紋要順著圈走才好看',
    family: 'solid',
    hasFace: true,
    needsWeave: false,
    minTextMm: 2,
    material: '淺色硬木（櫸木 / 橡木），上蠟',
    keywords:
      'a turned wooden woggle ring with visible grain running around the body, a laser-engraved emblem burned into the face',
    shot: 'three-quarter view, warm light raking across the grain',
    sizeSpec: (i, h) => `內徑 ${i} mm × 高 ${h} mm，壁厚 4–5 mm`,
    tooling: '雷雕免開模；車床件需治具',
    note: '雷雕是燒焦的深褐色，不是彩色 —— 想要顏色要另外上漆或鑲嵌。',
  },
  {
    value: 'print3d',
    label: '3D 列印',
    swatch: '#22d3ee',
    desc: '最適合把團徽立體化；內徑 22 mm 是社群常用檔案的標準',
    family: 'solid',
    hasFace: true,
    needsWeave: false,
    minTextMm: 2.5,
    material: '單色 PLA（深綠）',
    keywords:
      'a 3D-printed woggle, clean parametric shell with a raised emblem on the front, subtle horizontal layer lines, single filament colour',
    shot: 'three-quarter product render on a plain background',
    sizeSpec: (i, h) => `內徑 ${i} mm × 高 ${h} mm，壁厚 ≥ 2 mm`,
    tooling: '免開模，提供 STL / STEP 檔',
    note: '單色列印只有「凸起 / 凹陷」兩種層次，所以圖案要靠輪廓辨識，不能靠顏色分區。',
  },
  {
    value: 'metal',
    label: '金屬壓鑄 + 琺瑯',
    swatch: '#94a3b8',
    desc: '背面焊一個環，正面就是一枚小襟章；質感最好，要開模',
    family: 'plate',
    hasFace: true,
    needsWeave: false,
    minTextMm: 1,
    material: '古銀 / 鍍金底，彩色琺瑯',
    keywords:
      'a die-cast metal neckerchief slide, enamel colour fill between raised metal lines, polished plating, a soldered loop on the back for the neckerchief',
    shot: 'straight-on front view, crisp specular highlights on the metal lines',
    sizeSpec: (i, h, f) => `正面 ${f} mm，厚 2–3 mm，背環內徑 ${i} mm`,
    tooling: '需開鋅合金壓鑄模（模費一次性）',
    note: '琺瑯的每一塊顏色都必須被金屬線完全圍住；開放式漸層做不出來。',
  },
  {
    value: 'pvc',
    label: 'PVC 軟膠環',
    swatch: '#4ade80',
    desc: '模壓軟膠，顏色鮮、防水、摔不壞，大量做最便宜',
    family: 'solid',
    hasFace: true,
    needsWeave: false,
    minTextMm: 1.5,
    material: '亮綠軟膠，撞色黃字',
    keywords:
      'a moulded soft PVC rubber woggle, layered 3D relief in bright solid colours, matte rubber surface, rounded edges',
    shot: 'three-quarter view, even soft light on the rubber surface',
    sizeSpec: (i, h) => `內徑 ${i} mm × 高 ${h} mm`,
    tooling: '需開軟膠模（模費一次性）',
    note: '軟膠是一層一層堆出來的，所以要說清楚「哪一塊凸起、哪一塊凹下」。',
  },
  {
    value: 'fabric',
    label: '繡章 / 織帶捲筒',
    swatch: '#f472b6',
    desc: '把一片繡章或一段織帶縫成圈，跟整套章的風格最一致',
    family: 'fabric',
    hasFace: true,
    needsWeave: false,
    minTextMm: 4,
    material: '深綠織帶，金黃繡線',
    keywords:
      'a fabric woggle made from an embroidered patch rolled into a tube and stitched, visible thread texture and a stitched seam at the back',
    shot: 'three-quarter view, thread texture visible',
    sizeSpec: (i, h) => `展開長 ${Math.round(Number(i) * 3.14)} mm × 高 ${h} mm，內襯塑膠環`,
    tooling: '織嘜 / 電繡製版費',
    note: '布面會軟，久了會塌 —— 裡面通常要襯一圈塑膠環，描述時要提到它是挺的。',
  },
  {
    value: 'figurine',
    label: '立體造型 / 雕刻公仔',
    swatch: '#a78bfa',
    desc: 'BSA「每月一款」的傳統：一隻動物或一個物件，背後黏一截短管',
    family: 'figurine',
    hasFace: true,
    needsWeave: false,
    minTextMm: 3,
    material: '手繪木雕 / 樹脂',
    keywords:
      'a sculpted figurine neckerchief slide, a fully modelled character or object seen from the front, with a short tube glued behind it for the neckerchief',
    shot: 'three-quarter hero view of the figurine, the tube barely visible behind',
    sizeSpec: (i, h, f) => `造型最大外徑 ${f} mm，背管內徑 ${i} mm`,
    tooling: '需開模（樹脂或軟膠），或 3D 列印免開模',
    note: '造型類的重點是剪影：從兩公尺外只看得到輪廓，細節全部會消失。',
  },
  {
    value: 'resin',
    label: '樹脂包埋',
    swatch: '#38bdf8',
    desc: '把營火灰、沙、乾燥花、小徽章封進透明樹脂裡當紀念',
    family: 'solid',
    hasFace: true,
    needsWeave: false,
    minTextMm: 3,
    material: '透明樹脂，內嵌深綠苔與金箔',
    keywords:
      'a cast resin woggle, translucent body with small objects suspended inside, glossy domed surface catching light',
    shot: 'three-quarter view back-lit so the inclusions glow',
    sizeSpec: (i, h) => `內徑 ${i} mm × 高 ${h} mm`,
    tooling: '矽膠軟模，小量可手工灌製',
    note: '包埋物要說明「懸浮在中間」，否則 AI 會把它畫成印在表面的圖案。',
  },
  {
    value: 'beaded',
    label: '串珠 / 編繩包管',
    swatch: '#fb7185',
    desc: '珠繡或皮編包住一截管子，圖案是用一顆顆珠子排出來的',
    family: 'fabric',
    hasFace: true,
    needsWeave: false,
    minTextMm: 6,
    material: '白底、紅藍幾何珠',
    keywords:
      'a beaded neckerchief slide, tiny seed beads stitched in rows around a tube, the pattern built from individual bead pixels',
    shot: 'three-quarter view close enough to see individual beads',
    sizeSpec: (i, h) => `內徑 ${i} mm × 高 ${h} mm`,
    tooling: '全手工，無開模',
    note: '珠子就是像素：圖案必須能用方格紙畫出來，曲線與小字一律放棄。',
  },
];

export function woggleTypeById(id: string): WoggleTypeDef {
  return WOGGLE_TYPES.find((t) => t.value === id) ?? WOGGLE_TYPES[0];
}

/** 構造 → 它怎麼固定住領巾（寫進 JSON，AI 常常畫錯這點） */
export const HOLD_BY_FAMILY: Record<WoggleFamily, string> = {
  knot: 'the folded neckerchief passes through the centre of the woven ring; friction of the knot holds it',
  solid: 'the folded neckerchief passes through the bore of the solid ring',
  plate:
    'the folded neckerchief passes through slots in the plate (or a loop soldered on the back); the decorated face sits in front of the neckerchief',
  figurine: 'the folded neckerchief passes through a short tube fixed behind the figurine, which faces forward',
  fabric: 'the folded neckerchief passes through the stitched fabric tube',
};
