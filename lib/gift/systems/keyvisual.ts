// ---------------------------------------------------------------------------
// 紀念品主視覺
//
// 這條線的核心主張（使用者的原話）：
//   「紀念品其實最重要是平面圖設計完成，之後放在那種紀念品上而已。」
//
// 所以輸出的順序是：
//   主輸出 = 一張**可印的平面主視覺**（去背 / 平塗底、不是成品照、不是 mockup）
//   附件一 = 把那張圖套到各個紀念品上的第二階段提示詞（一個載體一段）
//   附件二 = 給廠商的印製規格單
// ---------------------------------------------------------------------------

import { JsonWriter, PromptWriter, keywordsOf, makeResolver } from '../../schema/builder';
import type { CardSystem, ExtraOutput, FieldDef, FillMode, ZoneDef } from '../../schema/types';
import { howToRead, LETTERING_RULES } from '../../badge/promptRules';
import { ART_STYLES, PALETTES } from '../../badge/systems/patch';
import { CARRIERS, carrierById, matchCarrier } from '../carriers';
import { GIFT_GROUPS } from '../groups';

const VB = { w: 640, h: 640 };

const zones: ZoneDef[] = [
  {
    id: 'canvas', label: '主視覺畫布（可印範圍）',
    fieldIds: ['carrier', 'orientation', 'background'],
    x: 14, y: 14, w: 612, h: 612, tone: 'soft',
  },
  {
    id: 'art', label: '主圖',
    fieldIds: ['motif', 'layout', 'symbols', 'detail'],
    x: 150, y: 150, w: 340, h: 250,
  },
  { id: 'title', label: '主標題', fieldIds: ['text_main', 'text_layout'], x: 110, y: 60, w: 420, h: 70 },
  { id: 'sub', label: '副標 / 年份', fieldIds: ['text_sub', 'year'], x: 150, y: 420, w: 340, h: 62 },
  { id: 'style', label: '風格與配色（決定能印幾色）', fieldIds: ['art_style', 'palette', 'palette_custom', 'color_count'], x: 36, y: 508, w: 290, h: 92 },
  { id: 'print', label: '印製方式', fieldIds: ['print_method', 'carrier_more', 'usage'], x: 352, y: 508, w: 252, h: 92 },
];

const LAYOUTS = [
  {
    value: 'emblem', label: '置中徽記', swatch: '#22d3ee',
    desc: '一個主圖置中，字繞著或放上下 —— 什麼載體都放得下，最保險',
    keywords: 'a single centred emblem with the lettering arranged above and below it, generous even margins',
  },
  {
    value: 'banner', label: '橫式橫幅', swatch: '#4ade80',
    desc: '左圖右字或上圖下字，適合杯子、織帶、袋子正面',
    keywords: 'a horizontal lockup, the illustration on one side and the lettering on the other, aligned on a shared baseline',
  },
  {
    value: 'stack', label: '直式堆疊', swatch: '#f59e0b',
    desc: '上下疊：標題、主圖、年份，適合本子封面與旗子',
    keywords: 'a vertical stack: title on top, illustration in the middle, year at the bottom',
  },
  {
    value: 'pattern', label: '滿版圖樣', swatch: '#a78bfa',
    desc: '把小元素排成可重複的圖樣，適合織帶、毛巾、包裝紙',
    keywords: 'a seamless repeating pattern of small motifs on a flat background, evenly spaced, tileable in all directions',
  },
  {
    value: 'corner', label: '角落標記', swatch: '#94a3b8',
    desc: '小小一枚放角落，低調、不搶走成品本身',
    keywords: 'a small compact mark designed to sit in a corner, simple enough to read at 20mm',
  },
];

const BACKGROUNDS = [
  {
    value: 'transparent', label: '去背（最通用）', swatch: '#64748b',
    desc: '沒有底色，之後印在什麼顏色的東西上都行',
    keywords: 'the artwork isolated on a pure flat white background with no shadow, ready to be cut out, nothing touching the edges',
  },
  {
    value: 'solid', label: '單色底', swatch: '#0f5132',
    desc: '有一塊底色，印在深色布料上最穩',
    keywords: 'the artwork on one flat solid background colour, no gradient, no texture',
  },
  {
    value: 'badgeform', label: '圓形 / 徽章式底', swatch: '#d97706',
    desc: '把主視覺收在一個圓或盾裡，直接能當貼紙或鑰匙圈',
    keywords: 'the artwork contained inside a clean badge shape with a defined outline, ready to be die-cut',
  },
  {
    value: 'fullbleed', label: '滿版出血', swatch: '#f472b6',
    desc: '圖填滿整個畫面，適合滿版印花',
    keywords: 'the artwork filling the entire frame edge to edge, full bleed, no margins',
  },
];

const PRINT_METHODS = [
  { value: 'screen', label: '絲網印刷', desc: '每色一塊版，4 色以內最划算', keywords: 'designed for screen printing: flat spot colours, no gradients, no halftones', minTextMm: 4, maxColors: 4 },
  { value: 'digital', label: '數位印刷 / 熱轉印', desc: '全彩不加價，細節最能留', keywords: 'designed for full-colour digital printing: gradients and fine detail are allowed', minTextMm: 2, maxColors: 99 },
  { value: 'uv', label: 'UV 直噴', desc: '硬質表面全彩，邊緣銳利', keywords: 'designed for UV direct printing on a hard surface: crisp edges, full colour', minTextMm: 2, maxColors: 99 },
  { value: 'embroidery', label: '電繡', desc: '立體有質感，但吃掉細節', keywords: 'designed to be embroidered: translate everything into solid stitch areas, no gradients, no hairlines', minTextMm: 5, maxColors: 9 },
  { value: 'laser', label: '雷射雕刻', desc: '單色（燒焦褐 / 金屬本色）', keywords: 'designed for laser engraving: a single-colour line-and-fill drawing, no colour, no shading', minTextMm: 2.5, maxColors: 1 },
  { value: 'foil', label: '燙金 / 燙銀', desc: '單色金屬箔，細線會糊', keywords: 'designed for metallic foil stamping: a single-colour silhouette drawing, line weight never below 0.5mm', minTextMm: 3, maxColors: 1 },
];

const SYMBOLS = [
  { value: 'none', label: '不用', keywords: '' },
  { value: 'fleur', label: '百合花徽', keywords: 'scout fleur-de-lis emblem' },
  { value: 'trefoil', label: '三葉草', keywords: 'girl scout trefoil emblem' },
  { value: 'knot', label: '繩結', keywords: 'reef knot / rope motif' },
  { value: 'compass', label: '指北針', keywords: 'compass rose motif' },
  { value: 'campfire', label: '營火', keywords: 'campfire with rising sparks' },
  { value: 'tent', label: '帳篷', keywords: 'ridge tent silhouette' },
  { value: 'mountain', label: '山稜', keywords: 'layered mountain ridge silhouette' },
];

const fields: FieldDef[] = [
  // --- 用途 ---------------------------------------------------------------
  {
    id: 'occasion', label: '這是為了什麼做的', group: 'purpose', impact: 'high',
    hint: '一句話。整張圖的主題，所有東西都回到它。',
    control: { kind: 'text', placeholder: '例如：2026 聯團大露營' },
    aiFillable: false, default: '2026 聯團大露營', essential: true,
  },
  {
    id: 'usage', label: '用途', group: 'purpose', impact: 'low',
    hint: '義賣品要搶眼、團隊識別要耐看、交換小物要好認。',
    control: { kind: 'select', options: [
      { value: 'souvenir', label: '營期紀念', keywords: 'an event souvenir design' },
      { value: 'fundraise', label: '義賣 / 募款', keywords: 'a fundraising merchandise design, eye-catching and appealing to buyers' },
      { value: 'identity', label: '團隊識別', keywords: 'a troop identity design, timeless rather than trendy' },
      { value: 'swap', label: '交換 / 小禮', keywords: 'a small swap gift design, instantly recognisable at a glance' },
    ] },
    aiFillable: false, default: 'souvenir',
  },

  // --- 主視覺 -------------------------------------------------------------
  {
    id: 'motif', label: '主圖畫什麼', group: 'visual', impact: 'high',
    hint: '最關鍵的一格。一個清楚的主體，不要塞三件事。',
    control: { kind: 'textarea', rows: 2, placeholder: '例如：一隻戴童軍帽的山豬，背後是帳篷與山稜' },
    aiFillable: true, aiInstruction: 'invent one clear hero motif that fits the theme',
    default: '一隻戴童軍帽的山豬，背後是帳篷與山稜', essential: true,
  },
  {
    id: 'layout', label: '版面配置', group: 'visual', impact: 'high',
    hint: '決定這張圖能放到哪些東西上。滿版圖樣只適合織帶、毛巾、包裝。',
    control: { kind: 'chips', options: LAYOUTS },
    aiFillable: false, default: 'emblem', essential: true,
  },
  {
    id: 'symbols', label: '童軍符號', group: 'visual', impact: 'mid',
    hint: '加一個通用符號，一眼看得出是童軍的東西。',
    control: { kind: 'chips', options: SYMBOLS },
    aiFillable: false, default: 'fleur',
  },
  {
    id: 'detail', label: '細節密度', group: 'visual', impact: 'mid',
    hint: '會縮到 20 mm 的東西（鑰匙圈、角落繡）一定要選大膽簡化。',
    control: { kind: 'select', options: [
      { value: 'bold', label: '大膽簡化（推薦）', keywords: 'bold simplified shapes, high readability even when shrunk to 20mm' },
      { value: 'medium', label: '適中', keywords: 'moderate detail, a clear hierarchy of large shapes and a few accents' },
      { value: 'rich', label: '繁複', keywords: 'rich detailed illustration, many small elements' },
    ] },
    aiFillable: false, default: 'bold',
  },

  // --- 文字 ---------------------------------------------------------------
  {
    id: 'text_main', label: '主標題', group: 'text', impact: 'high',
    hint: '會原樣印出來的字。少字大字最好看。',
    control: { kind: 'text', placeholder: '例如：新界東區聯團大露營' },
    aiFillable: false, default: '新界東區聯團大露營', essential: true,
  },
  {
    id: 'text_sub', label: '副標 / 英文', group: 'text', impact: 'mid',
    hint: '留空就不放。',
    control: { kind: 'text', placeholder: '例如：NTE DISTRICT CAMP' },
    aiFillable: false, default: 'NTE DISTRICT CAMP',
  },
  {
    id: 'year', label: '年份 / 屆數', group: 'text', impact: 'mid',
    hint: '紀念品一定要有年份，不然明年就分不出來了。',
    control: { kind: 'text', placeholder: '例如：2026' },
    aiFillable: false, default: '2026', essential: true,
  },
  {
    id: 'text_layout', label: '文字怎麼排', group: 'text', impact: 'mid',
    hint: '弧形最像徽章；橫排最好讀；不放字最適合滿版圖樣。',
    control: { kind: 'select', options: [
      { value: 'arc', label: '弧形繞圖', keywords: 'the lettering curved around the illustration' },
      { value: 'horizontal', label: '水平橫排', keywords: 'the lettering set horizontally in clean rows' },
      { value: 'banner', label: '綬帶 / 色塊上', keywords: 'the lettering sitting on a ribbon banner or a solid colour block' },
      { value: 'none', label: '不放字', keywords: '' },
    ] },
    aiFillable: false, default: 'horizontal',
  },

  // --- 風格 ---------------------------------------------------------------
  {
    id: 'art_style', label: '美術風格', group: 'style', impact: 'high',
    hint: '影響最大的一格。先選這個，其他才有意義。',
    control: { kind: 'chips', options: ART_STYLES },
    aiFillable: false, default: 'retro_patch', essential: true,
  },
  {
    id: 'palette', label: '配色', group: 'style', impact: 'high',
    hint: '紀念品通常一次做好幾樣，配色統一才看得出是一套。',
    control: { kind: 'chips', options: PALETTES },
    aiFillable: false, default: 'scout_classic', essential: true,
  },
  {
    id: 'palette_custom', label: '自訂配色', group: 'style', impact: 'mid',
    hint: '上面選「自訂」才要填。寫顏色名就好。',
    control: { kind: 'text', placeholder: '例如：墨綠、芥黃、磚紅、米白' },
    showIf: (v) => v.palette === 'custom',
    aiFillable: false, default: '',
  },
  {
    id: 'color_count', label: '色數', group: 'style', impact: 'high',
    hint: '絲印、繡、燙金都是按色數報價；數位印刷才可以不管。',
    control: { kind: 'select', options: ['1', '2', '3', '4', '5', '6', '全彩'].map((x) => ({ value: x, label: x === '全彩' ? '全彩（數位印才行）' : `${x} 色` })) },
    aiFillable: false, default: '4',
  },

  // --- 載體與輸出 ---------------------------------------------------------
  {
    id: 'carrier', label: '主要做在什麼上面', group: 'carrier', impact: 'high',
    hint: '只影響「安全框比例」與印製限制 —— 平面圖本身是通用的。',
    control: { kind: 'chips', options: CARRIERS.map((c) => ({
      value: c.value, label: c.label, desc: `${c.desc}（${c.areaMm} mm）`,
    })) },
    aiFillable: false, default: 'tshirt', essential: true,
  },
  {
    id: 'carrier_more', label: '還要套用在哪些（一行一個）', group: 'carrier', impact: 'mid',
    hint: '每一行會多產生一段「把主視覺套上去」的提示詞。可以自己打沒列在上面的品項。',
    control: { kind: 'textarea', rows: 3, placeholder: '帆布袋\n馬克杯\n壓克力鑰匙圈' },
    aiFillable: false, default: '帆布袋\n壓克力鑰匙圈',
  },
  {
    id: 'orientation', label: '畫布方向', group: 'carrier', impact: 'mid',
    hint: '不確定就選正方形 —— 之後裁成直式或橫式都還有餘裕。',
    control: { kind: 'select', options: [
      { value: 'square', label: '正方形（最通用）', keywords: 'square canvas, 1:1' },
      { value: 'portrait', label: '直式 3:4', keywords: 'portrait canvas, 3:4' },
      { value: 'landscape', label: '橫式 4:3', keywords: 'landscape canvas, 4:3' },
      { value: 'wide', label: '長橫條（織帶 / 杯身）', keywords: 'wide banner canvas, about 4:1' },
    ] },
    aiFillable: false, default: 'square',
  },
  {
    id: 'background', label: '底怎麼處理', group: 'carrier', impact: 'high',
    hint: '去背最通用：之後印在什麼顏色的東西上都不用重做。',
    control: { kind: 'chips', options: BACKGROUNDS },
    aiFillable: false, default: 'transparent', essential: true,
  },
  {
    id: 'print_method', label: '印製方式', group: 'carrier', impact: 'high',
    hint: '這一格會改寫畫風限制：雷雕只能單色、絲印不能漸層、電繡不能細線。',
    control: { kind: 'select', options: PRINT_METHODS },
    aiFillable: false, default: 'digital',
  },
];

// --- 檢查做不做得出來 -------------------------------------------------------

function checkPrint(values: Record<string, string>) {
  const carrier = carrierById(values.carrier || 'tshirt');
  const method = PRINT_METHODS.find((m) => m.value === (values.print_method || 'digital')) ?? PRINT_METHODS[1];
  const colors = values.color_count === '全彩' ? 99 : Number(values.color_count || '4');
  const out: { zh: string; en: string; fieldId?: string }[] = [];

  if (colors > method.maxColors) {
    out.push({
      fieldId: 'color_count',
      zh: `${method.label}最多 ${method.maxColors === 1 ? '單色' : method.maxColors + ' 色'}，目前設定 ${
        values.color_count
      } 色。請降低色數，或改用數位印刷。`,
      en: `Reduce the artwork to ${method.maxColors === 1 ? 'a single colour' : method.maxColors + ' flat colours'}; no gradients.`,
    });
  }

  const minTextMm = Math.max(method.minTextMm, carrier.minTextMm);
  if ((values.text_layout || 'horizontal') !== 'none') {
    out.push({
      fieldId: 'text_main',
      zh: `${carrier.label} + ${method.label}：最小可讀字高約 ${minTextMm} mm。字數越多字就越小，主標題建議 10 個字以內。`,
      en: `The smallest readable character on this product is about ${minTextMm}mm — keep the lettering short, bold and chunky, never hairline.`,
    });
  }

  if (values.layout === 'pattern' && carrier.wants === 'single') {
    out.push({
      fieldId: 'layout',
      zh: `「滿版圖樣」放在${carrier.label}上通常會變得很吵，這個載體比較適合單一主視覺。`,
      en: '',
    });
  }

  if (carrier.wants === 'pattern' && values.layout !== 'pattern') {
    out.push({
      fieldId: 'layout',
      zh: `${carrier.label}需要的是可以重複的橫向圖樣，不是一張單圖。建議版面改成「滿版圖樣」或「角落標記」。`,
      en: '',
    });
  }

  if (values.detail === 'rich' && (method.value === 'embroidery' || carrier.value === 'towel' || carrier.value === 'keychain')) {
    out.push({
      fieldId: 'detail',
      zh: `${carrier.label}／${method.label}吃不下繁複細節，實際做出來會糊成一團。建議改「大膽簡化」。`,
      en: 'Simplify aggressively: only bold shapes survive at this size and on this material.',
    });
  }

  out.push({ fieldId: 'carrier', zh: carrier.note, en: '' });

  return out;
}

const ORIENT_CANVAS: Record<string, string> = {
  square: 'a square canvas (1:1)',
  portrait: 'a portrait canvas (3:4)',
  landscape: 'a landscape canvas (4:3)',
  wide: 'a wide banner canvas (about 4:1)',
};

// --- 輸出 -------------------------------------------------------------------

function build(values: Record<string, string>, modes: Record<string, FillMode>) {
  const r = makeResolver(fields, values, modes);
  const kw = (id: string) => {
    const v = values[id] ?? '';
    if (!v || v === 'none') return '';
    return keywordsOf(fields, id, v);
  };

  const carrier = carrierById(values.carrier || 'tshirt');
  const method = PRINT_METHODS.find((m) => m.value === (values.print_method || 'digital')) ?? PRINT_METHODS[1];
  const motif = r('motif');
  const notes = checkPrint(values);
  const noText = (values.text_layout || 'horizontal') === 'none';
  const main = (values.text_main || '').trim();
  const sub = (values.text_sub || '').trim();
  const year = (values.year || '').trim();
  const palette =
    values.palette === 'custom'
      ? (values.palette_custom || '').trim() || 'a cohesive palette chosen by the AI'
      : kw('palette');

  const p = new PromptWriter();
  p.lit('A flat print-ready key visual for scout souvenirs. ');
  p.field('motif', motif.value, motif.ai);
  p.lit('. ');
  p.field('art_style', kw('art_style'));

  const j = new JsonWriter();
  j.open(null);
  j.arr(
    'how_to_read',
    howToRead(
      noText
        ? []
        : ([main && 'typography.title', sub && 'typography.subtitle', year && 'typography.year'].filter(
            Boolean
          ) as string[]),
      'flat artwork — not a product photo; the printed item is generated separately afterwards'
    ).map((t) => ({ text: t }))
  );

  j.kv('subject', `Flat key visual artwork for scout souvenirs — ${values.occasion || ''}`, 'occasion');
  j.kvForce(
    'stage',
    'STEP 1 of 2 — design the artwork only. Do not place it on any product, do not show a mug, shirt or bag.',
    'carrier'
  );
  j.kv('purpose', kw('usage'), 'usage');

  j.open('artwork');
  j.kv('hero_motif', motif.value, 'motif', motif.ai);
  j.kv('composition', kw('layout'), 'layout');
  j.kv('scout_symbol', kw('symbols'), 'symbols');
  j.kv('detail_density', kw('detail'), 'detail');
  j.kvForce('background', kw('background'), 'background', false, false);
  j.close();

  if (!noText) {
    j.open('typography');
    j.kv('arrangement', kw('text_layout'), 'text_layout');
    if (main) j.kv('title', main, 'text_main');
    if (sub) j.kv('subtitle', sub, 'text_sub');
    if (year) j.kv('year', year, 'year');
    j.kvForce('rules', LETTERING_RULES, 'text_main', false, false);
    j.close();
  }

  j.open('style');
  j.kv('art_direction', kw('art_style'), 'art_style');
  j.kvForce('palette', palette, values.palette === 'custom' ? 'palette_custom' : 'palette');
  j.kvForce(
    'colour_count',
    values.color_count === '全彩' ? 'full colour' : `${values.color_count || '4'} flat colours maximum`,
    'color_count',
    false,
    false
  );
  j.close();

  j.open('output');
  j.kvForce('format', 'a flat, straight-on, print-ready artwork — vector-like clean edges, no perspective, no mockup', 'background');
  j.kvForce('canvas', ORIENT_CANVAS[values.orientation || 'square'], 'orientation');
  j.kvForce(
    'reproduction',
    `${method.keywords}. It will be reproduced on ${carrier.label} at ${carrier.areaMm} mm.`,
    'print_method',
    false,
    false
  );
  j.close();

  const en = notes.filter((n) => n.en);
  if (en.length) j.arr('production_notes', en.map((n) => ({ text: n.en, fieldId: n.fieldId })));

  j.kvForce('negative_prompt', NEGATIVE, undefined, false, false);
  j.close('}', false);

  const lines = j.finish();

  return {
    segments: p.segments,
    jsonLines: lines,
    plain: lines.map((l) => l.text).join('\n'),
    negative: NEGATIVE,
    extras: [applyPrompts(values), specSheet(values, notes)],
  };
}

/** 要套用的載體清單：主要載體 + 使用者自己列的那幾行 */
function carrierList(values: Record<string, string>) {
  const main = carrierById(values.carrier || 'tshirt');
  const extra = (values.carrier_more || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const out: { label: string; def: ReturnType<typeof carrierById> | null }[] = [
    { label: main.label, def: main },
  ];
  for (const line of extra) {
    const def = matchCarrier(line);
    if (def && def.value === main.value) continue;
    out.push({ label: line, def });
  }
  return out;
}

/** 附件一：第二階段 —— 把主視覺套到每一樣紀念品上 */
function applyPrompts(values: Record<string, string>): ExtraOutput {
  const list = carrierList(values);
  const head = [
    '【第二階段：套到紀念品上】',
    '先用上面的主提示詞生出「平面主視覺」，滿意之後把那張圖當參考圖，',
    '再丟下面任何一段，就會生出對應的成品照。平面圖不用重畫。',
    '',
  ].join('\n');

  const body = list
    .map(({ label, def }) =>
      [
        `── ${label} ──`,
        'Using the attached artwork as the design (do not redraw it, do not change its colours or lettering):',
        def
          ? `· placement: ${def.placement}`
          : `· placement: apply the artwork to ${label}, centred within its usable print area, leaving a clear margin`,
        def ? `· print area: ${def.areaMm} mm, ${def.method}` : '· keep the artwork proportions unchanged',
        def ? `· shot: ${def.mockup}` : '· shot: studio product photo on a plain background, soft even light',
        '· the artwork must stay perfectly legible and undistorted',
        '',
      ].join('\n')
    )
    .join('\n');

  return {
    id: 'apply',
    label: `套用到紀念品（${list.length} 樣）`,
    desc: '第二階段：拿主視覺當參考圖，一樣一樣生成品照',
    text: head + body,
  };
}

/** 附件二：給廠商的印製規格單 */
function specSheet(values: Record<string, string>, notes: { zh: string }[]): ExtraOutput {
  const list = carrierList(values);
  const method = PRINT_METHODS.find((m) => m.value === (values.print_method || 'digital')) ?? PRINT_METHODS[1];
  const paletteLabel =
    values.palette === 'custom'
      ? (values.palette_custom || '').trim()
      : PALETTES.find((p) => p.value === values.palette)?.label ?? '';

  const rows: [string, string][] = [
    ['品名', `${values.occasion || ''} 紀念品主視覺`],
    ['版面', LAYOUTS.find((l) => l.value === values.layout)?.label ?? ''],
    ['畫布方向', ORIENT_CANVAS[values.orientation || 'square']],
    ['底的處理', BACKGROUNDS.find((b) => b.value === values.background)?.label ?? ''],
    ['主要印法', method.label],
    ['色數', values.color_count === '全彩' ? '全彩' : `${values.color_count || '4'} 色（${paletteLabel}）`],
    ['文字', [values.text_main, values.text_sub, values.year].filter(Boolean).join(' / ') || '（無）'],
    ['要做的品項', list.map((c) => (c.def ? `${c.label}（印製區 ${c.def.areaMm} mm，${c.def.method}）` : c.label)).join('；')],
  ];

  return {
    id: 'spec',
    label: '給廠商的印製規格單',
    desc: '一張主視覺、各品項的印製區與印法，可直接貼給廠商',
    text: [
      '紀念品 印製規格單',
      '——————————————————————',
      ...rows.map(([k, v]) => `${k}：${v}`),
      '',
      '【要注意的地方】',
      ...notes.map((n, i) => `${i + 1}. ${n.zh}`),
      '',
      '【報價請一併回覆】',
      '1. 每個品項的最低訂量與單價級距（同一張圖做多樣，有沒有合併折扣）',
      '2. 製版費 / 開版費：是不是每個品項、每個顏色各算一次',
      '3. 打樣：可否先做一件實物樣，費用與工時',
      '4. 需要的完稿格式（AI / PDF / PNG 幾 dpi）與是否需要外框字',
      '5. 交期，以及活動日前最晚的下單時間',
    ].join('\n'),
  };
}

const NEGATIVE =
  'product mockup, photo of a mug or shirt or bag, 3D perspective, drop shadow, reflections, cluttered background, misspelled text, gibberish letters, wrong Chinese characters, extra words, blurry, lowres, jpeg artifacts, watermark, signature';

export const keyVisualSystem: CardSystem = {
  id: 'keyvisual',
  label: '紀念品主視覺',
  sublabel: '先把平面圖做完，再放到東西上',
  accent: '#38bdf8',
  ratio: '一張平面圖 · 套用到任意品項',
  groups: GIFT_GROUPS,
  viewBox: VB,
  anatomyLabel: '版面對照圖',
  zones,
  fields,
  build,
  outline: (values) => {
    const carrier = carrierById(values.carrier || 'tshirt');
    const ratio =
      values.orientation === 'portrait'
        ? 0.75
        : values.orientation === 'landscape'
        ? 1.333
        : values.orientation === 'wide'
        ? 4
        : 1;
    const area = { x: 30, y: 30, w: VB.w - 60, h: VB.h - 60 };
    let w = area.w;
    let h = w / ratio;
    if (h > area.h) {
      h = area.h;
      w = h * ratio;
    }
    const x = area.x + (area.w - w) / 2;
    const y = area.y + (area.h - h) / 2;
    const inset = Math.min(w, h) * 0.07;
    return {
      d: `M ${x} ${y} h ${w} v ${h} h ${-w} Z`,
      splits: [
        `M ${x + inset} ${y + inset} h ${w - inset * 2} v ${h - inset * 2} h ${-(w - inset * 2)} Z`,
      ],
      fieldId: 'orientation',
      note: `外框＝畫布（${ORIENT_CANVAS[values.orientation || 'square']}），虛線＝安全框；${carrier.label} 的印製區 ${carrier.areaMm} mm`,
    };
  },
};
