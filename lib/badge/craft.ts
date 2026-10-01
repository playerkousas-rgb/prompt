// ---------------------------------------------------------------------------
// 工藝常識與「做得出來嗎」檢查
//
// 生圖 AI 不知道「電繡繡不出 3 mm 的字」、也不知道「包邊只能做規則外形」，
// 所以這些限制要變成提示詞裡的 manufacturing_notes，同時變成規格單上的提醒。
//
// 資料來源見 docs/badge-woggle-plan.md。
// ---------------------------------------------------------------------------

import { shapeById as shapeOf } from './shapes';

export interface CraftDef {
  value: string;
  label: string;
  enLabel: string;
  desc: string;
  keywords: string;
  /** 這個工藝可讀的最小文字高度（mm） */
  minTextMm: number;
  isEmbroidery: boolean;
  /** 給 render 用的質感字眼 */
  textureWord: string;
}

export const CRAFTS: CraftDef[] = [
  {
    value: 'embroidery',
    label: '電繡（刺繡章）',
    enLabel: 'embroidered patch',
    desc: '立體針腳、傳統厚實，童軍最常見。小字會糊（建議 5 mm 以上）',
    keywords: 'machine-embroidered patch, raised satin and fill stitches, visible thread sheen and stitch direction',
    minTextMm: 5,
    isEmbroidery: true,
    textureWord: 'thread stitch',
  },
  {
    value: 'woven',
    label: '織章',
    enLabel: 'woven patch',
    desc: '表面平滑細緻，小字與年份最清楚（2 mm 以上即可）',
    keywords: 'high-density woven patch, flat smooth surface, fine thread weave, crisp small lettering',
    minTextMm: 2,
    isEmbroidery: true,
    textureWord: 'fine woven',
  },
  {
    value: 'pvc',
    label: 'PVC 軟膠章',
    enLabel: 'PVC rubber patch',
    desc: '立體分層、顏色鮮豔、防水好洗，戶外最耐',
    keywords: 'soft PVC rubber patch, layered 3D relief, bright solid colours, matte rubber surface',
    minTextMm: 1.5,
    isEmbroidery: false,
    textureWord: 'moulded rubber',
  },
  {
    value: 'hard_enamel',
    label: '硬琺瑯襟章',
    enLabel: 'hard enamel pin',
    desc: '表面磨平如鏡、金屬線分色，質感最好',
    keywords: 'hard enamel metal pin, polished flush surface, crisp metal borders between colour fields, mirror plating',
    minTextMm: 1,
    isEmbroidery: false,
    textureWord: 'polished enamel and metal',
  },
  {
    value: 'soft_enamel',
    label: '軟琺瑯襟章',
    enLabel: 'soft enamel pin',
    desc: '色塊微下凹、金屬線浮凸，層次感強',
    keywords: 'soft enamel metal pin, recessed colour wells with raised metal lines, tactile relief',
    minTextMm: 1,
    isEmbroidery: false,
    textureWord: 'enamel and raised metal',
  },
  {
    value: 'epoxy',
    label: '滴膠章',
    enLabel: 'epoxy-domed badge',
    desc: '表面一層透明弧面膠，亮、有厚度',
    keywords: 'epoxy resin domed badge, glossy clear dome catching a soft highlight',
    minTextMm: 1.5,
    isEmbroidery: false,
    textureWord: 'glossy resin dome',
  },
];

export function craftById(id: string) {
  return CRAFTS.find((c) => c.value === id) ?? CRAFTS[0];
}

// 外形定義搬到 shapes.ts（那裡還會畫出真正的 SVG 外框）
export { BADGE_SHAPES as SHAPES, shapeById } from './shapes';

export const EDGES = [
  {
    value: 'merrow',
    label: '包邊（Merrow，3–4 mm）',
    desc: '傳統滾邊，厚實耐磨 —— 只能用在圓、橢圓、方、盾形',
    keywords: 'traditional merrowed overlock border about 3.5mm wide wrapping the rim',
  },
  {
    value: 'laser',
    label: '雷切 / 熱切',
    desc: '可做任意外形，邊薄、俐落',
    keywords: 'clean laser-cut edge with a thin stitched outline, following the artwork silhouette',
  },
];

export const COVERAGE = [
  { value: 'full', label: '100% 滿繡', keywords: '100% embroidery coverage, no base fabric showing' },
  { value: '75', label: '75%（局部露底布）', keywords: '75% embroidery coverage, twill base fabric visible in parts of the background' },
  { value: '50', label: '50%（復古感、較便宜）', keywords: '50% embroidery coverage on visible coloured twill, vintage contrast look' },
  { value: 'felt', label: '毛氈底（大色塊）', keywords: 'felt base fabric, bold simple colour areas' },
];

export const BACKINGS = [
  { value: 'none', label: '不背膠', keywords: '' },
  { value: 'iron', label: '軟膠 / 熱熔膠（可燙貼）', keywords: '' },
  { value: 'hard', label: '硬膠（挺但不黏）', keywords: '' },
  { value: 'sticky', label: '自黏膠（暫時性）', keywords: '' },
  { value: 'velcro', label: '魔鬼氈（可拆換）', keywords: '' },
];

export interface MfgNote {
  zh: string;
  en: string;
  fieldId?: string;
}

/**
 * 做得出來嗎？
 * 回傳的每一條都會同時出現在：提示詞的 manufacturing_notes、規格單的「要注意的地方」。
 */
export function checkManufacturing(values: Record<string, string>): MfgNote[] {
  const notes: MfgNote[] = [];
  const craft = craftById(values.craft || 'embroidery');
  const size = Number(values.size_mm || '75');
  const shape = shapeOf(values.shape || 'circle');
  const edge = values.edge || 'merrow';
  const colors = Number(values.color_count || '5');
  const hasText = (values.text_layout || 'arcs') !== 'none';

  // 文字高度：粗估「章的直徑 ÷ 12」是繞邊文字的字高
  const estTextMm = Math.round((size / 12) * 10) / 10;
  if (hasText && estTextMm < craft.minTextMm) {
    notes.push({
      fieldId: 'text_top',
      zh: `${size} mm 的章，繞邊文字大約只有 ${estTextMm} mm 高，但${craft.label}最小可讀字高是 ${craft.minTextMm} mm。建議：字數再少一點、放大尺寸，或改用織章。`,
      en: `At ${size}mm the rim lettering is only about ${estTextMm}mm tall, below the ${craft.minTextMm}mm minimum for ${craft.enLabel}. Keep the lettering short, bold and chunky; never render hairline strokes.`,
    });
  }

  if (edge === 'merrow' && !shape.merrowable) {
    notes.push({
      fieldId: 'edge',
      zh: `「${shape.label}」這種外形沒辦法包邊（包邊只能做圓、橢圓、方、盾形）。請改成雷切邊，或把外形換成規則形狀。`,
      en: 'A merrowed border only works on regular silhouettes; draw the rim as a clean laser-cut edge instead.',
    });
  }

  if (colors > 9 && craft.isEmbroidery) {
    notes.push({
      fieldId: 'color_count',
      zh: `${colors} 色超過一般含色數（9–12 色），報價通常會跳一級。紀念章其實 4–6 色最好看。`,
      en: `Limit the artwork to ${colors} flat colours; do not use gradients or blends.`,
    });
  }

  if (size <= 50 && values.detail === 'rich') {
    notes.push({
      fieldId: 'detail',
      zh: `${size} mm 又選了繁複細節，實際做出來會糊成一團。建議改「大膽簡化」。`,
      en: 'Simplify aggressively: at this size only bold shapes survive, drop fine internal detail.',
    });
  }

  if ((values.backing || 'iron') === 'iron') {
    notes.push({
      fieldId: 'backing',
      zh: '軟膠（熱熔）不適用於尼龍、皮革、毛衣等材質；貼在營帽或防水外套上建議改縫或改魔鬼氈。',
      en: '',
    });
  }

  if (craft.value === 'embroidery' && (values.art_style === 'painted' || values.detail === 'rich')) {
    notes.push({
      fieldId: 'art_style',
      zh: '刺繡做不出漸層與柔邊，擬真畫風會被針腳吃掉。可以保留擬真構圖，但請把色塊分明。',
      en: 'Embroidery cannot render gradients or soft edges — translate shading into discrete flat colour areas with visible stitch direction.',
    });
  }

  return notes;
}
