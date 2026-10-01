// ---------------------------------------------------------------------------
// 紀念章（做章）
//
// 設計哲學：**先把平面設計問清楚，工藝放最後。**
// 對生圖 AI 來說「電繡 / 織章 / PVC」只是一句材質描述，
// 真正決定一個章好不好看的是：主視覺、符號、文字排法、配色。
// 工藝那一組的真正價值在另一個出口 —— 給工廠的中文規格單。
// ---------------------------------------------------------------------------

import { JsonWriter, PromptWriter, keywordsOf, makeResolver } from '../../schema/builder';
import type { CardSystem, ExtraOutput, FieldDef, FillMode, ZoneDef } from '../../schema/types';
import { BADGE_GROUPS } from '../groups';
import { CRAFTS, EDGES, BACKINGS, COVERAGE, craftById, checkManufacturing } from '../craft';
import { BADGE_SHAPES as SHAPES, shapeById, fitBox } from '../shapes';
import { howToRead, LETTERING_RULES } from '../promptRules';
import { woggleSystem } from './woggle';

// 畫布用正方形 —— 章多半是圓的，用卡牌的 630×880 會很怪
const VB = { w: 640, h: 640 };

const zones: ZoneDef[] = [
  { id: 'outline', label: '外形 / 邊緣', fieldIds: ['shape', 'edge', 'size_mm'], x: 10, y: 10, w: 620, h: 620, tone: 'soft' },
  {
    id: 'art', label: '主視覺區（AI 生圖的主戰場）',
    fieldIds: ['theme', 'motif', 'layout', 'mascot', 'symbols', 'art_style', 'palette', 'palette_custom', 'color_count', 'detail'],
    x: 140, y: 150, w: 360, h: 300, tone: 'soft',
  },
  { id: 'toparc', label: '上緣文字弧', fieldIds: ['text_top', 'text_layout'], x: 110, y: 52, w: 420, h: 76 },
  { id: 'bottomarc', label: '下緣文字弧', fieldIds: ['text_bottom', 'text_layout'], x: 110, y: 506, w: 420, h: 72 },
  { id: 'year', label: '年份 / 屆數', fieldIds: ['year'], x: 258, y: 452, w: 124, h: 46 },
  { id: 'unit', label: '團號 / 單位', fieldIds: ['unit'], x: 36, y: 288, w: 92, h: 56 },
  { id: 'back', label: '背面（底材與背膠）', fieldIds: ['craft', 'backing', 'coverage', 'with_woggle'], x: 452, y: 452, w: 160, h: 66 },
  { id: 'wear', label: '佩戴位置與用途', fieldIds: ['badge_use', 'wear_place'], x: 28, y: 452, w: 160, h: 66 },
];

// ---------------------------------------------------------------------------

const LAYOUTS = [
  {
    value: 'emblem', label: '置中徽記', swatch: '#22d3ee',
    desc: '最安全、最像童軍章：中間一個主圖，文字繞邊',
    keywords: 'a single bold central emblem, concentric composition, text curved along the rim',
  },
  {
    value: 'scene', label: '風景窗', swatch: '#4ade80',
    desc: '把營地／山／海畫成一幅小風景，上下留文字帶',
    keywords: 'a small illustrated landscape scene filling the badge, horizon line, text bands above and below',
  },
  {
    value: 'mascot', label: '吉祥物主角', swatch: '#f472b6',
    desc: '一隻角色佔滿版面，表情要大、要可愛',
    keywords: 'a mascot character as the hero, large expressive face, character fills most of the badge',
  },
  {
    value: 'crest', label: '紋章盾形', swatch: '#eab308',
    desc: '分割盾面、綬帶，正式、像團徽',
    keywords: 'heraldic crest layout, quartered shield, ribbon banner across the lower third',
  },
  {
    value: 'diagonal', label: '斜切動態', swatch: '#a78bfa',
    desc: '對角線分割，適合運動、水上、攀登主題',
    keywords: 'dynamic diagonal split composition, motion sweep across the badge face',
  },
  {
    value: 'stack', label: '文字為主', swatch: '#94a3b8',
    desc: '字大圖小，年份或口號本身就是主視覺',
    keywords: 'typography-led layout, the lettering itself is the main visual, minimal supporting iconography',
  },
];

const SYMBOLS = [
  { value: 'none', label: '不用', keywords: '' },
  { value: 'fleur', label: '百合花徽', keywords: 'scout fleur-de-lis emblem' },
  { value: 'trefoil', label: '三葉草', keywords: 'girl scout trefoil emblem' },
  { value: 'knot', label: '繩結', keywords: 'reef knot / rope border motif' },
  { value: 'compass', label: '指北針', keywords: 'compass rose motif' },
  { value: 'campfire', label: '營火', keywords: 'campfire with rising sparks' },
  { value: 'tent', label: '帳篷', keywords: 'ridge tent silhouette' },
  { value: 'mountain', label: '山稜', keywords: 'layered mountain ridge silhouette' },
  { value: 'wave', label: '海浪', keywords: 'stylised wave motif' },
];

export const ART_STYLES = [
  {
    value: 'retro_patch', label: '復古徽章', swatch: '#d97706',
    desc: '70–80 年代國家公園章感：粗輪廓、限色、微做舊',
    keywords: 'vintage 1970s national-park patch illustration, thick confident outlines, limited flat colour palette, slight print texture',
  },
  {
    value: 'flat_vector', label: '扁平向量', swatch: '#22d3ee',
    desc: '最乾淨、最好生產：純色塊、無漸層',
    keywords: 'flat vector emblem design, pure solid colour shapes, no gradients, crisp geometry, sticker-ready',
  },
  {
    value: 'mascot_jp', label: '日系吉祥物', swatch: '#f472b6',
    desc: '圓潤可愛、大眼睛，小朋友最買單',
    keywords: 'Japanese kawaii mascot design, rounded shapes, big expressive eyes, cheerful friendly tone',
  },
  {
    value: 'line_crest', label: '線稿徽記', swatch: '#e2e8f0',
    desc: '單色線條、細緻典雅，適合金屬或壓印',
    keywords: 'fine monoline crest illustration, single-weight linework, elegant and restrained',
  },
  {
    value: 'painted', label: '擬真插畫', swatch: '#a78bfa',
    desc: '有明暗與質感，細節多（提醒：工藝會吃掉細節）',
    keywords: 'richly painted illustration with shading and texture, depth and atmosphere',
  },
  {
    value: 'anime_action', label: '動漫熱血', swatch: '#ef4444',
    desc: '動態線、衝擊感，像少年漫畫扉頁',
    keywords: 'shonen anime action illustration, speed lines, dramatic perspective, high energy',
  },
];

export const PALETTES = [
  {
    value: 'scout_classic', label: '童軍經典（深綠＋金黃）', swatch: '#0f5132',
    keywords: 'classic scouting palette: deep forest green, golden yellow, cream, dark brown',
  },
  { value: 'camp_sunset', label: '營火夕陽（橙紅＋深藍）', swatch: '#f97316', keywords: 'campfire sunset palette: burnt orange, crimson, deep navy, warm cream' },
  { value: 'sea', label: '海童軍（藍白）', swatch: '#1565c0', keywords: 'sea scout palette: navy, bright marine blue, white, rope beige' },
  { value: 'forest', label: '森林（墨綠＋土棕）', swatch: '#14532d', keywords: 'woodland palette: pine green, moss, earth brown, bark grey' },
  { value: 'neon', label: '高彩霓虹（年輕感）', swatch: '#d946ef', keywords: 'high-chroma youthful palette: magenta, electric cyan, lime, black' },
  { value: 'custom', label: '自訂色票', swatch: '#64748b', keywords: '' },
];

const fields: FieldDef[] = [
  // ---- 用途 ----
  {
    id: 'badge_use', label: '這個章的用途', group: 'purpose', impact: 'mid',
    hint: '用途會決定它要多耐看、多好交換 —— 交換章要一眼認得出是哪一團。',
    control: { kind: 'select', options: [
      { value: 'event', label: '活動 / 營期紀念章', keywords: 'event commemorative patch' },
      { value: 'unit', label: '團徽章', keywords: 'troop identity patch' },
      { value: 'swap', label: '交換章（Swap）', keywords: 'collectible swap patch, instantly recognisable identity' },
      { value: 'anniversary', label: '週年紀念章', keywords: 'anniversary commemorative patch' },
      { value: 'award', label: '成就 / 挑戰章', keywords: 'achievement challenge patch' },
    ] },
    aiFillable: false, default: 'event', essential: true,
  },
  {
    id: 'wear_place', label: '戴在哪裡', group: 'purpose', impact: 'low',
    hint: '位置決定尺寸：胸章 7–10 cm、臂章 3–5 cm、帽章 2–4 cm、背包營毯 5–8 cm。',
    control: { kind: 'select', options: [
      { value: 'chest', label: '左胸 / 右胸', keywords: 'worn on the uniform chest' },
      { value: 'sleeve', label: '臂章', keywords: 'worn on the sleeve' },
      { value: 'cap', label: '帽章', keywords: 'worn on the cap' },
      { value: 'bag', label: '背包 / 營毯', keywords: 'collected on a backpack or camp blanket' },
    ] },
    aiFillable: false, default: 'bag',
  },
  {
    id: 'shape', label: '外形（先決定這個）', group: 'purpose', impact: 'high',
    hint: '外框決定整張章的氣質，也決定能不能包邊。選了之後右邊對照圖會真的畫成那個形狀。',
    control: { kind: 'chips', options: SHAPES.map((sh) => ({
      value: sh.value, label: sh.label, desc: sh.desc + (sh.merrowable ? '' : '（不能包邊）'),
      swatch: sh.merrowable ? '#4ade80' : '#f59e0b',
    })) },
    aiFillable: false, default: 'circle', essential: true,
  },
  {
    id: 'size_mm', label: '成品尺寸（mm）', group: 'purpose', impact: 'low',
    hint: '越小越要簡化。5 cm 以下就別想塞小字與細節。',
    control: { kind: 'select', options: [
      { value: '30', label: '30 mm（帽章 / 迷你）' },
      { value: '50', label: '50 mm' },
      { value: '65', label: '65 mm' },
      { value: '75', label: '75 mm（最常見）' },
      { value: '90', label: '90 mm' },
      { value: '110', label: '110 mm（背章）' },
    ] },
    aiFillable: false, default: '75',
  },

  // ---- 主視覺 ----
  {
    id: 'theme', label: '主題一句話', group: 'visual', impact: 'high',
    hint: '把這個章在紀念什麼講成一句話。這是整張圖的種子。',
    control: { kind: 'text', placeholder: '例如：2026 新界東區聯團大露營' },
    aiFillable: false, default: '2026 聯團大露營', essential: true,
  },
  {
    id: 'motif', label: '核心物件', group: 'visual', impact: 'high',
    hint: '章上最大的那個東西。寫 1–3 樣就好，塞太多一定糊。',
    control: { kind: 'textarea', rows: 2, placeholder: '例如：營火、搭好的帳篷、遠方的山稜線' },
    aiFillable: true, aiInstruction: 'one or two strong focal objects chosen by the AI that suit the theme',
    default: '營火與背後的帳篷剪影', essential: true,
  },
  {
    id: 'layout', label: '版面配置', group: 'visual', impact: 'high',
    hint: '決定「圖與字怎麼分地盤」，比畫風更早該決定。',
    control: { kind: 'chips', options: LAYOUTS },
    aiFillable: false, default: 'emblem', essential: true,
  },
  {
    id: 'mascot', label: '吉祥物 / 角色', group: 'visual', impact: 'mid',
    hint: '要有角色才填。沒有就留空，畫面會更乾淨。',
    control: { kind: 'text', placeholder: '例如：戴童軍帽的小山豬' },
    aiFillable: true, aiInstruction: 'a cute original mascot that fits the theme',
    default: '',
  },
  {
    id: 'symbols', label: '童軍符號', group: 'visual', impact: 'mid',
    hint: '借用通用符號，一眼就看得出是童軍的章。',
    control: { kind: 'chips', options: SYMBOLS },
    aiFillable: false, default: 'fleur',
  },
  {
    id: 'detail', label: '細節密度', group: 'visual', impact: 'mid',
    hint: '章是小東西，細節密度建議偏低 —— 遠看有形狀比近看有細節重要。',
    control: { kind: 'select', options: [
      { value: 'bold', label: '大膽簡化（推薦）', keywords: 'bold simplified shapes, high readability at small size, minimal internal detail' },
      { value: 'balanced', label: '平衡', keywords: 'balanced detail with a clear focal hierarchy' },
      { value: 'rich', label: '繁複（小尺寸會糊）', keywords: 'richly detailed illustration' },
    ] },
    aiFillable: false, default: 'bold',
  },

  // ---- 文字 ----
  {
    id: 'text_layout', label: '文字排法', group: 'text', impact: 'mid',
    hint: '上中文下英文的雙弧是紀念章最穩的版型。',
    control: { kind: 'select', options: [
      { value: 'arcs', label: '上下弧（經典）', keywords: 'text curved along the top and bottom rim of the badge' },
      { value: 'top_only', label: '只有上緣弧', keywords: 'text curved along the top rim only' },
      { value: 'banner', label: '綬帶橫幅', keywords: 'lettering on a ribbon banner across the badge' },
      { value: 'straight', label: '橫排置中', keywords: 'horizontal centred lettering' },
      { value: 'none', label: '完全不要文字', keywords: 'no lettering at all, pure icon' },
    ] },
    aiFillable: false, default: 'arcs',
  },
  {
    id: 'text_top', label: '上緣文字（中文）', group: 'text', impact: 'high',
    hint: '最常被模型寫錯的地方。字少一點、筆畫簡單一點，成功率高很多。',
    control: { kind: 'text', placeholder: '例如：新界東區聯團大露營' },
    aiFillable: false, default: '新界東區聯團大露營', essential: true,
  },
  {
    id: 'text_bottom', label: '下緣文字（英文）', group: 'text', impact: 'mid',
    hint: '英文比中文好繡也好畫，建議放全大寫。',
    control: { kind: 'text', placeholder: 'NTE DISTRICT CAMP' },
    aiFillable: false, default: 'NTE DISTRICT CAMP',
  },
  {
    id: 'year', label: '年份 / 屆數', group: 'text', impact: 'mid',
    hint: '紀念章的靈魂。數字比文字可靠，建議一定要有。',
    control: { kind: 'text', placeholder: '2026' },
    aiFillable: false, default: '2026', essential: true,
  },
  {
    id: 'unit', label: '團號 / 單位', group: 'text', impact: 'low',
    hint: '交換章一定要有，別人才知道這是誰的章。',
    control: { kind: 'text', placeholder: '例如：第 12 旅' },
    aiFillable: false, default: '',
  },

  // ---- 風格與配色 ----
  {
    id: 'art_style', label: '美術風格', group: 'style', impact: 'high',
    hint: '全站影響力最大的一格。先選這個，其他才有意義。',
    control: { kind: 'chips', options: ART_STYLES },
    aiFillable: false, default: 'retro_patch', essential: true,
  },
  {
    id: 'palette', label: '配色', group: 'style', impact: 'high',
    hint: '選「自訂色票」時才會用到下面那格的 hex。',
    control: { kind: 'chips', options: PALETTES },
    aiFillable: false, default: 'scout_classic', essential: true,
  },
  {
    id: 'palette_custom', label: '自訂色票（hex）', group: 'style', impact: 'mid',
    hint: '用逗號分隔，例如 #0f5132, #f6c445, #ffffff。只有上面選「自訂色票」才生效。',
    control: { kind: 'text', placeholder: '#0f5132, #f6c445, #ffffff' },
    aiFillable: false, default: '',
  },
  {
    id: 'color_count', label: '色數', group: 'style', impact: 'mid',
    hint: '色數＝成本。電繡一般含 9–12 色，超過要加錢；紀念章 4–6 色最好看也最好做。',
    control: { kind: 'select', options: [
      { value: '3', label: '3 色（最俐落）' },
      { value: '4', label: '4 色' },
      { value: '5', label: '5 色' },
      { value: '6', label: '6 色' },
      { value: '8', label: '8 色' },
      { value: '12', label: '12 色（細節多、較貴）' },
    ] },
    aiFillable: false, default: '5',
  },

  // ---- 工藝（最後才問）----
  {
    id: 'with_woggle', label: '要不要順便出配套巾圈', group: 'craft', impact: 'low',
    hint: '同一個主題、同一組配色，多給一份巾圈的生圖 JSON（附在提示詞下面）。',
    control: { kind: 'select', options: [
      { value: 'none', label: '不用' },
      { value: 'pvc', label: '要：PVC 軟膠巾圈' },
      { value: 'metal', label: '要：金屬琺瑯巾圈' },
      { value: 'print3d', label: '要：3D 列印巾圈' },
      { value: 'leather_plate', label: '要：皮片巾圈' },
      { value: 'fabric', label: '要：繡面巾圈' },
    ] },
    aiFillable: false, default: 'none',
  },
  {
    id: 'craft', label: '工藝', group: 'craft', impact: 'mid',
    hint: '對生圖只是一句材質描述；對工廠才是規格。選完下面會自動檢查做不做得出來。',
    control: { kind: 'select', options: CRAFTS.map((c) => ({ value: c.value, label: c.label, desc: c.desc, keywords: c.keywords })) },
    aiFillable: false, default: 'embroidery', essential: true,
  },
  {
    id: 'edge', label: '邊緣處理', group: 'craft', impact: 'low',
    hint: '包邊固定 3–4 mm、只能用在規則外形；雷切可做任意外形、邊可細到 1 mm。',
    control: { kind: 'select', options: EDGES },
    aiFillable: false, default: 'merrow',
  },
  {
    id: 'coverage', label: '底布 / 繡滿程度', group: 'craft', impact: 'low',
    hint: '露底布＝復古省錢；100% 滿繡＝細節最多最挺。只有刺繡類要管這格。',
    control: { kind: 'select', options: COVERAGE },
    aiFillable: false, default: 'full',
  },
  {
    id: 'backing', label: '背膠', group: 'craft', impact: 'low',
    hint: '軟膠（熱熔）可以燙貼，但尼龍、皮革、毛衣不適用，建議再縫。',
    control: { kind: 'select', options: BACKINGS },
    aiFillable: false, default: 'iron',
  },
];

// ---------------------------------------------------------------------------

function build(values: Record<string, string>, modes: Record<string, FillMode>) {
  const r = makeResolver(fields, values, modes);
  const kw = (id: string) => {
    const v = values[id] ?? '';
    if (!v || v === 'none') return '';
    return keywordsOf(fields, id, v);
  };

  const craft = craftById(values.craft || 'embroidery');
  const size = Number(values.size_mm || '75');
  const shape = shapeById(values.shape || 'circle');
  const notes = checkManufacturing(values);

  const theme = r('theme').value || '童軍紀念章';
  const motif = r('motif');
  const mascot = r('mascot');
  const textTop = (values.text_top || '').trim();
  const textBottom = (values.text_bottom || '').trim();
  const year = (values.year || '').trim();
  const unit = (values.unit || '').trim();
  const noText = values.text_layout === 'none';

  const palette =
    values.palette === 'custom'
      ? (values.palette_custom || '').trim() || 'a cohesive palette chosen by the AI'
      : kw('palette');

  // --- 自然語言（備用，主要輸出是下面的 JSON）---
  const p = new PromptWriter();
  p.lit('A scout commemorative patch design. ');
  p.field('theme', theme);
  p.lit('. ');
  if (motif.value) { p.lit('Focal motif: '); p.field('motif', motif.value, motif.ai); p.lit('. '); }
  p.lit('Layout: '); p.field('layout', kw('layout')); p.lit('. ');
  p.lit('Style: '); p.field('art_style', kw('art_style')); p.lit('. ');

  // --- 主輸出 JSON ---
  const j = new JsonWriter();
  j.open(null);
  j.arr(
    'how_to_read',
    howToRead(
      noText
        ? []
        : [
            textTop && 'typography.top_text_zh',
            textBottom && 'typography.bottom_text_en',
            year && 'typography.year',
            unit && 'typography.unit',
          ].filter(Boolean) as string[],
      'embroidered patch'
    ).map((t) => ({ text: t }))
  );
  j.kv('subject', `Scout commemorative patch artwork — ${theme}`, 'theme');
  j.kv('badge_use', kw('badge_use'), 'badge_use');

  j.open('artwork');
  j.kv('focal_motif', motif.value, 'motif', motif.ai);
  j.kv('composition', kw('layout'), 'layout');
  j.kv('mascot', mascot.value, 'mascot', mascot.ai);
  j.kv('scout_symbol', kw('symbols'), 'symbols');
  j.kv('detail_density', kw('detail'), 'detail');
  j.kvForce(
    'silhouette',
    `${shape.keywords}, designed to read clearly at ${size} mm across`,
    'shape',
    false,
    false
  );
  j.close();

  j.open('typography');
  if (noText) {
    j.kvForce('lettering', 'No lettering anywhere on the badge — icon only.', 'text_layout', false, false);
  } else {
    j.kv('arrangement', kw('text_layout'), 'text_layout');
    j.kv('top_text_zh', textTop, 'text_top');
    j.kv('bottom_text_en', textBottom, 'text_bottom');
    j.kv('year', year, 'year');
    j.kv('unit', unit, 'unit');
    j.kvForce(
      'rules',
      'Spell every character exactly as given. Traditional Chinese characters must be correctly formed. Keep lettering bold and evenly spaced; never invent extra words.',
      'text_top',
      false,
      false
    );
  }
  j.close();

  j.open('style');
  j.kv('art_direction', kw('art_style'), 'art_style');
  j.kv('palette', palette, values.palette === 'custom' ? 'palette_custom' : 'palette');
  j.kvForce('colour_count', `${values.color_count || '5'} flat colours maximum`, 'color_count', false, false);
  j.close();

  j.open('craft');
  j.kv('method', craft.keywords, 'craft');
  j.kv('edge', EDGES.find((e) => e.value === (values.edge || 'merrow'))?.keywords ?? '', 'edge');
  if (craft.isEmbroidery) {
    j.kv('coverage', COVERAGE.find((c) => c.value === (values.coverage || 'full'))?.keywords ?? '', 'coverage');
  }
  j.kvForce('size', `${size} mm across`, 'size_mm', false, false);
  j.close();

  {
    const en = notes.filter((n) => n.en);
    if (en.length) j.arr('manufacturing_notes', en.map((n) => ({ text: n.en, fieldId: n.fieldId })));
  }

  j.kv(
    'render',
    `Studio product photograph of the finished ${craft.enLabel}, shot flat and straight-on, filling the frame on a pure white background, soft even light, visible ${craft.textureWord} texture, no mockup shadows, no mannequin, no uniform`
  );
  j.kvForce(
    'negative_prompt',
    NEGATIVE,
    undefined,
    false,
    false
  );
  j.close('}', false);

  const lines = j.finish();
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1];
    if (lines[i].text.trimEnd().endsWith('],') && next && next.text.trim().startsWith('}')) {
      lines[i] = { ...lines[i], text: lines[i].text.replace(/,$/, '') };
    }
  }

  return {
    segments: p.segments,
    jsonLines: lines,
    plain: lines.map((l) => l.text).join('\n'),
    negative: NEGATIVE,
    extras: [...matchingWoggle(values, modes), specSheet(values, notes)],
  };
}

const NEGATIVE =
  'misspelled text, gibberish letters, wrong Chinese characters, extra words, blurry, lowres, jpeg artifacts, photo of a person wearing it, cluttered background, drop shadow, 3D mockup perspective, watermark, signature';

// --- 給工廠的中文規格單 -----------------------------------------------------

function specSheet(
  values: Record<string, string>,
  notes: { zh: string }[]
): ExtraOutput {
  const craft = craftById(values.craft || 'embroidery');
  const shape = shapeById(values.shape || 'circle').label;
  const edge = EDGES.find((e) => e.value === (values.edge || 'merrow'))?.label ?? '包邊';
  const backing = BACKINGS.find((b) => b.value === (values.backing || 'iron'))?.label ?? '軟膠（熱熔）';
  const coverage = COVERAGE.find((c) => c.value === (values.coverage || 'full'))?.label ?? '100% 滿繡';
  const palette =
    values.palette === 'custom'
      ? (values.palette_custom || '（未指定）')
      : PALETTES.find((p) => p.value === values.palette)?.label ?? '';

  const rows = [
    ['品名', `${values.theme || '童軍紀念章'}（${values.year || ''}）`],
    ['用途', { event: '活動／營期紀念章', unit: '團徽章', swap: '交換章', anniversary: '週年紀念章', award: '成就章' }[values.badge_use || 'event'] ?? ''],
    ['工藝', craft.label],
    ['尺寸', `${values.size_mm || '75'} mm（長寬平均值）`],
    ['外形', shape],
    ['邊緣處理', edge],
    ...(craft.isEmbroidery ? [['底布 / 繡度', coverage]] : []),
    ['背面處理', backing],
    ['色數', `${values.color_count || '5'} 色${values.palette === 'custom' && values.palette_custom ? `（${values.palette_custom}）` : palette ? `（${palette}）` : ''}`],
    ['文字', values.text_layout === 'none' ? '無' : [values.text_top, values.text_bottom, values.year, values.unit].filter(Boolean).join(' / ')],
  ] as [string, string][];

  const body = rows.map(([k, v]) => `${k}：${v}`).join('\n');

  const warn = notes.length
    ? `\n\n【要注意的地方】\n${notes.map((n, i) => `${i + 1}. ${n.zh}`).join('\n')}`
    : '';

  return {
    id: 'spec',
    label: '給工廠的規格單',
    desc: '連同設計稿一起寄給廠商報價，少一次來回。',
    text:
      `童軍紀念章 製作規格單\n${'—'.repeat(22)}\n${body}${warn}\n\n【報價請一併回覆】\n` +
      `1. 最低訂量（一般 100 片起）與不同數量的單價\n` +
      `2. 打樣費與打樣時間\n` +
      `3. 含色數上限，超色如何計價\n` +
      `4. 交期（含海運／空運）\n5. 是否提供車線／包邊顏色色卡`,
  };
}


/**
 * 配套巾圈：把章的主題、符號、配色、風格原封不動搬到巾圈系統，
 * 直接借用巾圈的 build() 產出第二份生圖 JSON —— 兩件東西才會真的像一套。
 */
function matchingWoggle(values: Record<string, string>, modes: Record<string, FillMode>): ExtraOutput[] {
  const type = values.with_woggle || 'none';
  if (type === 'none') return [];

  // 風格要配合材質：皮革 / 布面才適合「傳統木章感」，軟膠與金屬走現代極簡
  const soft = ['leather_plate', 'fabric', 'wood'].includes(type);
  const styleMap: Record<string, string> = {
    retro_patch: soft ? 'heritage' : 'minimal',
    flat_vector: 'minimal',
    kawaii: 'playful',
    line_crest: 'minimal',
    painted: soft ? 'handmade' : 'minimal',
  };
  // 給生圖 AI 的配色要用英文色名，不要用中文選項標籤
  const paletteWord =
    values.palette === 'custom'
      ? (values.palette_custom || '').trim()
      : PALETTES.find((p) => p.value === values.palette)?.keywords ?? '';

  const wv: Record<string, string> = {
    woggle_type: type,
    occasion: values.badge_use === 'event' ? 'camp' : 'troop',
    emblem: (values.motif || '').trim() || (values.theme || '').trim(),
    symbols: values.symbols || 'none',
    mount: 'back_loop',
    face_mm: '30 × 30',
    inner_mm: '22',
    height_mm: '25',
    engrave_text: (values.year || '').trim() || (values.unit || '').trim(),
    engrave_style: 'relief',
    art_style: styleMap[values.art_style || 'retro_patch'] ?? 'heritage',
    material_color: paletteWord,
    color_count: values.color_count || '3',
    qty: '100',
    finish: 'matte',
    scarf_color: '',
  };
  const wm: Record<string, FillMode> = {};
  for (const k of Object.keys(wv)) wm[k] = 'locked';

  const out = woggleSystem.build(wv, wm);
  return [
    {
      id: 'woggle',
      label: '配套巾圈的生圖 JSON',
      desc: '沿用同一個主題、符號與配色，兩件擺在一起才像一套',
      text: out.plain,
    },
  ];
}

export const patchSystem: CardSystem = {
  id: 'patch',
  label: '紀念章',
  sublabel: '布章 / 繡章 / 襟章',
  accent: '#f6c445',
  ratio: '預設 75 mm 圓章',
  groups: BADGE_GROUPS,
  viewBox: VB,
  anatomyLabel: '章面對照圖',
  baseImages: [
    {
      id: 'embroidery',
      label: '電繡圓章',
      desc: '75 mm 滿繡圓章、包邊、復古徽章風（AI 生成的示範，用來對照版面）',
      src: '/base/patch-embroidery.avif',
    },
  ],
  zones,
  fields,
  build,
  outline: (values) => {
    const sh = shapeById(values.shape || 'circle');
    const box = fitBox({ x: 26, y: 26, w: VB.w - 52, h: VB.h - 52 }, sh.ratio);
    const edge = values.edge || 'merrow';
    return {
      d: sh.path(box),
      fieldId: 'shape',
      note:
        `外框：${sh.label} · ${sh.merrowable ? '可包邊' : '只能雷切'}` +
        (edge === 'merrow' && !sh.merrowable ? ' —— 目前選了包邊，工廠做不出來，請改雷切。' : ''),
    };
  },
};
