// ---------------------------------------------------------------------------
// 紀念品載體
//
// 使用者說得很準：紀念品最重要的是**把平面圖設計完**，之後只是放到哪一種東西上。
// 所以這條產品線的主輸出是「一張可印的平面主視覺」，載體是第二階段的套用。
//
// 每個載體要知道四件事，才能真的拿去做：
//   1. 印製區多大（mm）與長寬比 → 決定主視覺要做直式、橫式還是方形
//   2. 常用印法 → 決定色數與細節能留多少
//   3. 最小可讀字高 → 決定文字能不能放
//   4. 套用時的鏡頭怎麼下 → 第二階段的 mockup 提示詞
// ---------------------------------------------------------------------------

export interface CarrierDef {
  value: string;
  label: string;
  desc: string;
  /** 印製區（mm），字串好讀 */
  areaMm: string;
  /** 印製區長寬比 w/h，用來畫安全框 */
  ratio: number;
  /** 常用印法（中文，給規格單） */
  method: string;
  /** 最小可讀字高（mm） */
  minTextMm: number;
  /** 建議的主視覺型態：單一圖（single）或可重複的圖樣（pattern） */
  wants: 'single' | 'pattern' | 'both';
  /** 第二階段：怎麼把主視覺放上去（英文，給生圖 AI） */
  placement: string;
  /** 第二階段：成品照怎麼拍（英文） */
  mockup: string;
  /** 這個載體的坑（中文） */
  note: string;
}

export const CARRIERS: CarrierDef[] = [
  {
    value: 'tshirt',
    label: 'T 恤 / 團服',
    desc: '最常見的團體紀念品，前胸小圖或背後大圖',
    areaMm: '前胸 100 × 100；背後 280 × 380',
    ratio: 1,
    method: '絲網印刷（量大）／熱轉印（量小、全彩）',
    minTextMm: 4,
    wants: 'single',
    placement:
      'the artwork printed on the chest of a plain cotton t-shirt, centred, about a hand span wide, following the fabric folds',
    mockup:
      'flat-lay product photo of the folded t-shirt on a neutral background, soft even light, the print perfectly legible',
    note: '深色衣要先打白墨底，顏色才不會被吃掉；絲印每多一色就多一塊版，4 色以內最划算。',
  },
  {
    value: 'tote',
    label: '帆布袋',
    desc: '義賣、營期發放都很好用，單色絲印最便宜',
    areaMm: '240 × 240',
    ratio: 1,
    method: '絲網印刷',
    minTextMm: 5,
    wants: 'single',
    placement: 'the artwork screen-printed on the front panel of a natural canvas tote bag, centred, slightly above the middle',
    mockup: 'the tote bag hanging flat against a plain wall, straight-on, soft daylight, visible canvas weave',
    note: '帆布織紋會吃掉細線，1 mm 以下的線條會斷斷續續；單色或雙色最穩。',
  },
  {
    value: 'mug',
    label: '馬克杯',
    desc: '留念感最強，杯身是曲面',
    areaMm: '展開 200 × 80（單面約 80 × 80）',
    ratio: 2.5,
    method: '熱昇華轉印（全彩）',
    minTextMm: 3,
    wants: 'both',
    placement:
      'the artwork wrapped around the body of a white ceramic mug, curving with the surface, clear of the handle',
    mockup: 'studio product photo of the mug at a slight three-quarter angle on a plain background, soft even light',
    note: '圖不能壓到把手兩側各 20 mm；轉印到杯口與杯底要各留 10 mm，否則會切到。',
  },
  {
    value: 'enamel_mug',
    label: '琺瑯杯 / 露營杯',
    desc: '戶外感最強，但燒製色數有限',
    areaMm: '單面 70 × 60',
    ratio: 1.17,
    method: '轉印燒製（建議 3 色以內）',
    minTextMm: 4,
    wants: 'single',
    placement: 'the artwork printed on the side of a white enamel camping mug with a dark rim',
    mockup: 'the enamel mug on a wooden table outdoors, shallow depth of field, warm natural light',
    note: '高溫燒製後顏色會略微變深；漸層幾乎做不出來，請用平塗色塊。',
  },
  {
    value: 'keychain',
    label: '壓克力鑰匙圈',
    desc: '最便宜的交換小物，外形可以跟著圖切',
    areaMm: '50 × 50',
    ratio: 1,
    method: 'UV 直噴 + 雷射切割外形',
    minTextMm: 2,
    wants: 'single',
    placement:
      'the artwork as a die-cut clear acrylic keychain, the outline following the artwork silhouette, a metal ring at the top',
    mockup: 'the keychain held flat against a plain background, straight-on, soft light with a slight acrylic edge glow',
    note: '外形要留 2 mm 的安全邊，吊環孔附近不能有重要圖案；細長突出（尾巴、旗杆）容易斷。',
  },
  {
    value: 'sticker',
    label: '貼紙',
    desc: '成本最低、最好交換，外形自由',
    areaMm: '60 × 60',
    ratio: 1,
    method: '數位印刷 + 模切',
    minTextMm: 2,
    wants: 'single',
    placement: 'the artwork as a die-cut vinyl sticker with a 3mm white border following its silhouette',
    mockup: 'the sticker lying flat on a plain surface, straight-on, soft shadow, slight glossy highlight',
    note: '模切公差 ±1 mm，所以白邊至少留 3 mm；全出血的圖容易切到內容。',
  },
  {
    value: 'towel',
    label: '毛巾 / 方巾',
    desc: '營期實用品，毛圈會吃掉細節',
    areaMm: '繡圖 80 × 80；印花 300 × 300',
    ratio: 1,
    method: '電繡（角落）／數位印花（滿版）',
    minTextMm: 10,
    wants: 'both',
    placement: 'the artwork embroidered in the corner of a folded cotton towel',
    mockup: 'the folded towel on a plain surface, three-quarter view, soft light showing the pile texture',
    note: '毛圈布是最吃細節的材質：線條低於 2 mm 會消失，小字請直接放棄。',
  },
  {
    value: 'flag',
    label: '隊旗 / 錦旗',
    desc: '儀式與合照用，尺寸最大、細節最能留',
    areaMm: '600 × 900',
    ratio: 0.67,
    method: '數位印花（雙面需鏡像）／電繡',
    minTextMm: 15,
    wants: 'single',
    placement: 'the artwork printed on a hanging fabric troop flag, gentle cloth folds, grommets along one edge',
    mockup: 'the flag hanging straight against a plain wall, front view, even soft light',
    note: '雙面旗要另外出一張鏡像檔；旗杆側 60 mm 是縫邊，不能放內容。',
  },
  {
    value: 'bottle',
    label: '水壺 / 保溫瓶',
    desc: '曲面大、單色 UV 印最清楚',
    areaMm: '180 × 70（弧面）',
    ratio: 0.39,
    method: 'UV 印刷／雷雕（不鏽鋼）',
    minTextMm: 3,
    wants: 'single',
    placement: 'the artwork printed vertically on the body of a stainless steel water bottle, following the curve',
    mockup: 'studio product photo of the bottle standing, slight three-quarter angle, plain background, soft reflections',
    note: '弧面兩側各 15 mm 會變形，重要內容要集中在中間；雷雕只有單色（金屬本色）。',
  },
  {
    value: 'wood',
    label: '木牌 / 木質吊飾',
    desc: '手感最好，但只有單色（燒焦褐）',
    areaMm: '80 × 60',
    ratio: 1.33,
    method: '雷射雕刻',
    minTextMm: 2.5,
    wants: 'single',
    placement: 'the artwork laser-engraved into a light wood plaque, scorched dark brown lines on bare grain',
    mockup: 'the wooden plaque on a plain surface, raking warm light to show the engraved depth and the grain',
    note: '雷雕沒有顏色只有深淺，請把配色轉換成「線條 + 填滿網點」的黑白稿。',
  },
  {
    value: 'lanyard',
    label: '識別證帶 / 織帶',
    desc: '需要可以重複的橫向圖樣，不是單一張圖',
    areaMm: '900 × 20',
    ratio: 45,
    method: '熱轉印織帶／提花織帶',
    minTextMm: 4,
    wants: 'pattern',
    placement:
      'the artwork repeated as a continuous horizontal pattern along a narrow woven lanyard strap',
    mockup: 'the lanyard laid out in a loose S-curve on a plain surface, straight-on, soft light',
    note: '帶子只有 20 mm 寬：請把主視覺簡化成一個 15 mm 高的小圖 + 一行字，重複排列。',
  },
  {
    value: 'notebook',
    label: '筆記本 / 手冊封面',
    desc: '直式版面，適合放大標題與年份',
    areaMm: '148 × 210（A5）',
    ratio: 0.7,
    method: '數位印刷／燙金',
    minTextMm: 3,
    wants: 'single',
    placement: 'the artwork printed on the front cover of a closed A5 notebook, centred with generous margins',
    mockup: 'the notebook lying flat on a plain desk, slight angle, soft daylight, visible cover texture',
    note: '裝訂側要留 12 mm；燙金只有單色，而且細線會糊，建議線寬 ≥ 0.5 mm。',
  },
];

export function carrierById(id: string): CarrierDef {
  return CARRIERS.find((c) => c.value === id) ?? CARRIERS[0];
}

/** 從自由輸入的一行文字猜載體（使用者可以自己加「悠遊卡貼」這種品項） */
export function matchCarrier(line: string): CarrierDef | null {
  const t = line.trim();
  if (!t) return null;
  return CARRIERS.find((c) => t.includes(c.label) || t.toLowerCase().includes(c.value)) ?? null;
}
