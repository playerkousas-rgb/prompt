// ---------------------------------------------------------------------------
// 巾圈（Woggle / Neckerchief Slide）
//
// 常識（來源見 docs/badge-woggle-plan.md）：
//   · 1920 年代初 Gilwell Park 的 Bill Shankley 用縫紉機傳動皮繩做出
//     兩圈土耳其頭結皮領圈，成為極偉皮領圈（Gilwell Woggle）的原型
//   · 內徑約 19–22 mm、高度約 25 mm，要緊到不會自己滑下來
//   · 常見材質：皮繩、傘繩 550、打包帶、木、3D 列印、金屬、樹脂
//
// 這一套**只輸出生圖提示詞**（使用者確認過：不做動手做教學）。
// ---------------------------------------------------------------------------

import { JsonWriter, PromptWriter, keywordsOf, makeResolver } from '../../schema/builder';
import type { CardSystem, FieldDef, FillMode, ZoneDef } from '../../schema/types';
import { WOGGLE_GROUPS } from '../groups';
import { WOGGLE_TYPES, woggleTypeById, HOLD_BY_FAMILY } from '../woggleTypes';

const VB = { w: 640, h: 640 };

const zones: ZoneDef[] = [
  {
    id: 'body', label: '環身（材質與編法）',
    fieldIds: ['woggle_type', 'occasion', 'material_color', 'knot', 'cord_pattern', 'mount', 'finish'],
    x: 60, y: 150, w: 520, h: 340, tone: 'soft',
  },
  { id: 'face', label: '正面圖案', fieldIds: ['emblem', 'art_style', 'symbols'], x: 190, y: 210, w: 260, h: 220 },
  { id: 'bore', label: '內徑（領巾穿過這裡）', fieldIds: ['inner_mm'], x: 262, y: 280, w: 116, h: 92 },
  { id: 'height', label: '高度', fieldIds: ['height_mm'], x: 60, y: 150, w: 54, h: 340 },
  { id: 'engrave', label: '刻字 / 名牌', fieldIds: ['engrave_text', 'engrave_style'], x: 180, y: 452, w: 280, h: 62 },
  { id: 'scarf', label: '領巾（配色參考）', fieldIds: ['scarf_color'], x: 60, y: 528, w: 520, h: 76, tone: 'soft' },
];

const TYPES = WOGGLE_TYPES;
const typeOf = (values: Record<string, string>) => woggleTypeById(values.woggle_type || 'knot_leather');

const fields: FieldDef[] = [
  {
    id: 'woggle_type', label: '巾圈類型', group: 'purpose', impact: 'high',
    hint: '先選這個 —— 構造決定了有沒有正面可以放圖、要不要問編法、字能刻多小。',
    control: { kind: 'chips', options: TYPES.map((t) => ({
      value: t.value, label: t.label, swatch: t.swatch, desc: t.desc,
    })) },
    aiFillable: false, default: 'knot_leather', essential: true,
  },
  {
    id: 'occasion', label: '用途', group: 'purpose', impact: 'low',
    hint: '木章領圈、團用、營期紀念，氣質不一樣。',
    control: { kind: 'select', options: [
      { value: 'troop', label: '團用巾圈', keywords: 'everyday troop woggle' },
      { value: 'woodbadge', label: '木章 / 領袖', keywords: 'Wood Badge style leader woggle, traditional and restrained' },
      { value: 'camp', label: '營期紀念', keywords: 'camp souvenir woggle' },
      { value: 'gift', label: '送禮 / 交換', keywords: 'gift-grade woggle, presentation quality' },
    ] },
    aiFillable: false, default: 'camp',
  },

  {
    id: 'emblem', label: '正面圖案', group: 'visual', impact: 'high',
    hint: '巾圈的面很小，一個圖案就好 —— 團徽、百合花、動物頭、年份都可以。',
    showIf: (v) => typeOf(v).hasFace,
    control: { kind: 'text', placeholder: '例如：百合花徽 + 小山豬側臉' },
    aiFillable: true, aiInstruction: 'a simple bold emblem that reads at thumbnail size',
    default: '百合花徽', essential: true,
  },
  {
    id: 'symbols', label: '童軍符號', group: 'visual', impact: 'mid',
    showIf: (v) => typeOf(v).hasFace,
    hint: '加一個通用符號，一眼看得出是童軍的東西。',
    control: { kind: 'chips', options: [
      { value: 'none', label: '不用', keywords: '' },
      { value: 'fleur', label: '百合花徽', keywords: 'scout fleur-de-lis' },
      { value: 'trefoil', label: '三葉草', keywords: 'girl scout trefoil' },
      { value: 'knotmotif', label: '繩結', keywords: 'reef knot motif' },
      { value: 'compass', label: '指北針', keywords: 'compass rose' },
      { value: 'campfire', label: '營火', keywords: 'campfire motif' },
    ] },
    aiFillable: false, default: 'fleur',
  },
  {
    id: 'knot', label: '編法 / 結構', group: 'visual', impact: 'mid',
    hint: '瓣數越多越華麗，也越難編。扁帶（打包帶）跟圓繩的結長得不一樣。',
    showIf: (v) => typeOf(v).needsWeave,
    control: { kind: 'select', options: [
      { value: '3l5b', label: '3 瓣 5 道（3L5B，經典）', keywords: 'three-lead five-bight Turk\'s head weave' },
      { value: 'two_strand', label: '兩圈皮繩（極偉樣式）', keywords: 'two-strand leather Turk\'s head, the classic Gilwell pattern' },
      { value: '7x3', label: '七瓣三層（打包帶常用）', keywords: 'seven-bight three-pass woven ring' },
      { value: 'plait', label: '雙股編（Double plait）', keywords: 'double-plaited woven band' },
    ] },
    aiFillable: false, default: 'two_strand',
  },
  {
    id: 'cord_pattern', label: '繩子配色走法', group: 'visual', impact: 'mid',
    hint: '雙色一定要說清楚誰走外圈，不然 AI 會畫成隨機混色。',
    control: { kind: 'select', options: [
      { value: 'single', label: '單色', keywords: 'a single cord colour throughout' },
      { value: 'spiral', label: '雙色螺旋', keywords: 'two cord colours spiralling alternately through the weave' },
      { value: 'half', label: '雙色對分（上下各一色）', keywords: 'two cord colours split across the ring, one colour per half' },
      { value: 'core', label: '主色 + 細撞色線', keywords: 'one dominant cord colour with a thin contrasting accent strand' },
    ] },
    showIf: (v) => typeOf(v).family === 'knot',
    aiFillable: false, default: 'single',
  },
  {
    id: 'mount', label: '領巾怎麼穿過', group: 'visual', impact: 'mid',
    hint: '平片與造型類最常被 AI 畫錯：它不是一個圈，是一片面 + 背後的環。',
    control: { kind: 'select', options: [
      { value: 'slots', label: '正面打兩道孔（領巾直接穿）', keywords: 'two punched slots in the plate, the neckerchief threaded through them' },
      { value: 'three_hole', label: '三孔（傳統皮片）', keywords: 'the classic three-hole leather slide, the neckerchief woven through three slots' },
      { value: 'back_loop', label: '背面焊 / 黏一個環', keywords: 'a loop fixed on the back, the decorated face sitting flat in front' },
      { value: 'snap', label: '壓扣（可拆開）', keywords: 'a press-stud strap that wraps the neckerchief and snaps shut' },
    ] },
    showIf: (v) => ['plate', 'figurine'].includes(typeOf(v).family),
    aiFillable: false, default: 'back_loop',
  },
  {
    id: 'inner_mm', label: '內徑（mm）', group: 'visual', impact: 'mid',
    hint: '領巾要穿得過又不能鬆。市售多為 19 mm（3/4 吋），3D 列印檔常用 22 mm。',
    control: { kind: 'select', options: [
      { value: '19', label: '19 mm（3/4 吋，市售標準）' },
      { value: '22', label: '22 mm（3D 列印常見）' },
      { value: '25', label: '25 mm（厚領巾 / 雙摺）' },
      { value: '28', label: '28 mm（粗捲領巾）' },
    ] },
    aiFillable: false, default: '22', essential: true,
  },
  {
    id: 'height_mm', label: '高度（mm）', group: 'visual', impact: 'low',
    hint: '約 25 mm 最順手；太矮會翻、太高會卡下巴。',
    control: { kind: 'select', options: [
      { value: '20', label: '20 mm（薄）' },
      { value: '25', label: '25 mm（標準）' },
      { value: '32', label: '32 mm（厚實）' },
    ] },
    aiFillable: false, default: '25',
  },

  {
    id: 'engrave_text', label: '刻字內容', group: 'text', impact: 'mid',
    hint: '名字、團號、年份擇一就好，巾圈的面真的很小。',
    showIf: (v) => typeOf(v).hasFace,
    control: { kind: 'text', placeholder: '例如：12th HK 2026' },
    aiFillable: false, default: '', essential: true,
  },
  {
    id: 'engrave_style', label: '刻字方式', group: 'text', impact: 'low',
    showIf: (v) => typeOf(v).hasFace,
    hint: '雷雕最清楚；皮革壓印最有手感；浮雕最立體。',
    control: { kind: 'select', options: [
      { value: 'none', label: '不刻字', keywords: '' },
      { value: 'laser', label: '雷射雕刻（凹）', keywords: 'laser-engraved recessed lettering' },
      { value: 'stamp', label: '壓印（皮革）', keywords: 'hand-stamped impressed lettering in the leather' },
      { value: 'relief', label: '浮雕（凸）', keywords: 'raised relief lettering' },
    ] },
    aiFillable: false, default: 'laser',
  },

  {
    id: 'art_style', label: '造型風格', group: 'style', impact: 'high',
    hint: '同一個團徽，走復古手作或現代極簡，氣質天差地遠。',
    control: { kind: 'chips', options: [
      { value: 'handmade', label: '手作質樸', swatch: '#a16207', desc: '看得出手工痕跡、材料本色', keywords: 'rustic handmade craft feel, natural material tones, honest tool marks' },
      { value: 'minimal', label: '現代極簡', swatch: '#22d3ee', desc: '乾淨幾何、單色', keywords: 'modern minimal product design, clean geometry, single colour' },
      { value: 'heritage', label: '傳統木章感', swatch: '#8b5e3c', desc: '深棕皮革、歲月感', keywords: 'traditional Gilwell heritage look, dark aged leather, understated' },
      { value: 'playful', label: '童趣可愛', swatch: '#f472b6', desc: '圓潤、亮色，幼童軍最愛', keywords: 'playful cute design, rounded forms, bright cheerful colours' },
    ] },
    aiFillable: false, default: 'handmade', essential: true,
  },
  {
    id: 'material_color', label: '材料顏色', group: 'style', impact: 'mid',
    hint: '皮繩棕、傘繩雙色、列印單色…講清楚 AI 才不會亂配。',
    control: { kind: 'text', placeholder: '例如：深棕皮繩；或 深綠＋金黃 雙色傘繩' },
    aiFillable: false, default: '深棕皮繩', essential: true,
  },
  {
    id: 'scarf_color', label: '搭配的領巾顏色', group: 'style', impact: 'low',
    hint: '會畫一截領巾穿過巾圈，看得出搭起來的樣子。留空就不畫領巾。',
    control: { kind: 'text', placeholder: '例如：深綠底、黃邊' },
    aiFillable: false, default: '深綠底、黃邊',
  },
  {
    id: 'finish', label: '表面處理', group: 'style', impact: 'low',
    hint: '亮面比較搶眼，霧面比較耐看也比較耐髒。',
    control: { kind: 'select', options: [
      { value: 'matte', label: '霧面', keywords: 'matte finish' },
      { value: 'satin', label: '緞面', keywords: 'satin sheen finish' },
      { value: 'gloss', label: '亮面', keywords: 'glossy lacquered finish' },
      { value: 'waxed', label: '上蠟（皮革）', keywords: 'waxed leather finish with a soft lustre' },
    ] },
    aiFillable: false, default: 'matte',
  },
];

function build(values: Record<string, string>, modes: Record<string, FillMode>) {
  const r = makeResolver(fields, values, modes);
  const kw = (id: string) => {
    const v = values[id] ?? '';
    if (!v || v === 'none') return '';
    return keywordsOf(fields, id, v);
  };

  const type = typeOf(values);
  const emblem = r('emblem');
  const inner = values.inner_mm || '22';
  const height = values.height_mm || '25';
  const engrave = (values.engrave_text || '').trim();
  const scarf = (values.scarf_color || '').trim();
  const material = (values.material_color || '').trim() || type.material;

  const p = new PromptWriter();
  p.lit('A scout neckerchief woggle. ');
  p.field('woggle_type', type.keywords);
  p.lit('. ');
  if (type.hasFace && emblem.value) {
    p.lit('Face emblem: ');
    p.field('emblem', emblem.value, emblem.ai);
    p.lit('. ');
  }

  const j = new JsonWriter();
  j.open(null);
  j.kv('subject', `Scout neckerchief woggle (neckerchief slide) — ${type.label}`, 'woggle_type');
  j.kv('use', kw('occasion'), 'occasion');

  // --- form：構造。巾圈最常被 AI 畫錯的就是這裡 ---------------------------
  j.open('form');
  j.kvForce('family', FAMILY_EN[type.family], 'woggle_type');
  j.kv('construction', type.keywords, 'woggle_type');
  if (type.needsWeave) j.kv('weave', kw('knot'), 'knot');
  if (type.family === 'knot') j.kv('cord_pattern', kw('cord_pattern'), 'cord_pattern');
  if (type.family === 'plate' || type.family === 'figurine') {
    j.kv('mounting', kw('mount'), 'mount');
  }
  j.kvForce('how_it_holds', HOLD_BY_FAMILY[type.family], 'woggle_type');
  j.kvForce(
    'dimensions',
    `the opening the neckerchief passes through is about ${inner}mm across and ${height}mm deep, snug enough that the neckerchief does not slip`,
    'inner_mm',
    false,
    false
  );
  j.close();

  // --- face：只有真的有「面」的構造才寫 -----------------------------------
  if (type.hasFace) {
    j.open('face');
    j.kv('emblem', emblem.value, 'emblem', emblem.ai);
    j.kv('scout_symbol', kw('symbols'), 'symbols');
    if (engrave && values.engrave_style !== 'none') {
      j.kv('lettering', `"${engrave}" — ${kw('engrave_style')}`, 'engrave_text');
      j.kvForce(
        'lettering_rules',
        `Spell the lettering exactly as given. On this kind of woggle the smallest readable character is about ${type.minTextMm}mm, so keep it to a few bold characters.`,
        'engrave_text',
        false,
        false
      );
    } else {
      j.kvForce('lettering', 'no lettering', 'engrave_style', false, false);
    }
    j.close();
  } else {
    j.kvForce(
      'face',
      'no decorated face — the design is entirely the weave pattern and the cord colours',
      'woggle_type'
    );
  }

  j.open('style');
  j.kv('art_direction', kw('art_style'), 'art_style');
  j.kv('material_colour', material, 'material_color');
  j.kv('surface', kw('finish'), 'finish');
  j.kvForce('making_note', type.note, 'woggle_type');
  j.kvForce(
    'constraint',
    'The whole object is only a few centimetres across — bold shapes only, no fine detail, nothing that would vanish at thumbnail size.',
    'woggle_type',
    false,
    false
  );
  j.close();

  j.kv(
    'render',
    `Studio product photograph, ${type.shot}` +
      (scarf
        ? `, the woggle threaded onto a folded scout neckerchief (${scarf})`
        : ', the woggle alone') +
      ', plain light background, soft even light, shallow depth of field, material texture clearly visible',
    'scarf_color'
  );
  j.kvForce('negative_prompt', NEGATIVE, undefined, false, false);
  j.close('}', false);

  const lines = j.finish();
  return {
    segments: p.segments,
    jsonLines: lines,
    plain: lines.map((l) => l.text).join('\n'),
    negative: NEGATIVE,
  };
}

const FAMILY_EN: Record<string, string> = {
  knot: 'woven cord ring (knot type) — there is no flat front face',
  solid: 'solid ring turned, cast or printed in one material',
  plate: 'flat decorated plate worn in front of the neckerchief, not a ring',
  figurine: 'sculpted figurine with a short tube behind it',
  fabric: 'fabric tube stitched from a patch or webbing',
};

const NEGATIVE =
  'person wearing it, full uniform, face, misspelled text, gibberish letters, blurry, lowres, cluttered background, watermark, signature, deformed ring, broken weave';

export const woggleSystem: CardSystem = {
  id: 'woggle',
  label: '巾圈',
  sublabel: 'Woggle / 領巾圈',
  accent: '#8b5e3c',
  ratio: '內徑 19–28 mm · 高約 25 mm',
  groups: WOGGLE_GROUPS,
  viewBox: VB,
  anatomyLabel: '巾圈對照圖',
  baseImages: [
    {
      id: 'leather',
      label: '皮繩土耳其頭結',
      desc: '兩圈土耳其頭結皮領圈（極偉樣式），穿著深綠黃邊領巾',
      src: '/base/woggle-leather.avif',
    },
  ],
  zones,
  fields,
  build,
  outline: (values) => {
    const t = woggleTypeById(values.woggle_type || 'knot_leather');
    const cx = VB.w / 2;
    const cy = VB.h / 2;
    if (t.family === 'plate' || t.family === 'figurine') {
      // 平片 / 造型類：畫一片面，不是一個圈
      const w = 300;
      const h = 230;
      return {
        d: `M ${cx - w / 2} ${cy - h / 2} h ${w} a 26 26 0 0 1 26 26 v ${h - 52} a 26 26 0 0 1 -26 26 h ${-w} a 26 26 0 0 1 -26 -26 v ${-(h - 52)} a 26 26 0 0 1 26 -26 Z`,
        fieldId: 'woggle_type',
        note: `${t.label}：${t.note}`,
      };
    }
    const R = 190;
    const r = 78;
    return {
      d:
        `M ${cx - R} ${cy} a ${R} ${R} 0 1 0 ${R * 2} 0 a ${R} ${R} 0 1 0 ${-R * 2} 0 Z ` +
        `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`,
      fieldId: 'woggle_type',
      note: `${t.label}：${t.note}`,
    };
  },
};
