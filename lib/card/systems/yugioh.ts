import { BASE_NEGATIVE, JsonWriter, PromptWriter, keywordsOf, makeResolver } from '../builder';
import { classicFinishField } from '../classic';
import type { CardSystem, FieldDef, FillMode, ZoneDef } from '../types';

// 遊戲王卡比例為 59 × 86 mm，插圖窗是正方形 —— 這點跟寶可夢/OP 很不一樣
const zones: ZoneDef[] = [
  { id: 'name', label: '卡名', fieldIds: ['name'], x: 21, y: 20, w: 486, h: 60 },
  { id: 'attr', label: '屬性球', fieldIds: ['attribute'], x: 512, y: 25, w: 60, h: 54 },
  { id: 'level', label: '星數 / 階級', fieldIds: ['level'], x: 244, y: 100, w: 278, h: 34 },
  {
    id: 'art', label: '插圖窗（正方形！構圖要以方形思考）',
    fieldIds: ['name', 'pose', 'expression', 'anatomy', 'bg_setting', 'bg_details', 'bg_atmosphere',
      'art_style', 'attribute', 'summon_fx', 'camera', 'palette'],
    x: 77, y: 156, w: 480, h: 460, tone: 'soft',
  },
  { id: 'typeline', label: '種族 / 類型', fieldIds: ['monster_type', 'frame_type'], x: 35, y: 650, w: 560, h: 36 },
  { id: 'effect', label: '效果文字框', fieldIds: ['effect_text', 'pendulum_text'], x: 35, y: 688, w: 560, h: 104 },
  { id: 'atkdef', label: 'ATK / DEF', fieldIds: ['atk', 'def'], x: 386, y: 794, w: 210, h: 32 },
  { id: 'meta', label: '卡號 / 繪師', fieldIds: ['set_code', 'illustrator'], x: 29, y: 828, w: 212, h: 28 },
  { id: 'frame', label: '卡框 / 稀有度', fieldIds: ['frame_type', 'rarity', 'foil'], x: 8, y: 8, w: 614, h: 864, tone: 'soft' },
];

const FRAMES = [
  { value: 'normal', label: '通常怪獸', swatch: '#c9a227', desc: '米黃卡框，插圖最純粹', keywords: 'beige Normal Monster card frame' },
  { value: 'effect', label: '效果怪獸', swatch: '#c76b2b', desc: '橘棕卡框，最常見', keywords: 'orange Effect Monster card frame' },
  { value: 'ritual', label: '儀式怪獸', swatch: '#5b8ccf', desc: '藍卡框', keywords: 'blue Ritual Monster card frame' },
  { value: 'fusion', label: '融合怪獸', swatch: '#8b5bbf', desc: '紫卡框', keywords: 'purple Fusion Monster card frame' },
  { value: 'synchro', label: '同步怪獸', swatch: '#e8e8e8', desc: '白卡框', keywords: 'white Synchro Monster card frame' },
  { value: 'xyz', label: '超量怪獸', swatch: '#1f1f1f', desc: '黑卡框', keywords: 'black Xyz Monster card frame' },
  { value: 'link', label: '連結怪獸', swatch: '#1d4ed8', desc: '深藍卡框 + 箭頭', keywords: 'dark blue Link Monster card frame with glowing link arrows around the artwork' },
  { value: 'spell', label: '魔法卡', swatch: '#1aa07a', desc: '綠卡框', keywords: 'green Spell Card frame' },
  { value: 'trap', label: '陷阱卡', swatch: '#bc5a84', desc: '洋紅卡框', keywords: 'magenta Trap Card frame' },
];

const STYLES = [
  { value: 'ocg_classic', label: 'OCG 經典', swatch: '#eab308', desc: '90 年代 OCG 感：濃厚筆觸、暗沉背景', keywords: 'classic Yu-Gi-Oh OCG card illustration, Kazuki Takahashi era rendering, dense airbrushed shading, dark moody backdrop' },
  { value: 'modern_ocg', label: '現代 OCG', swatch: '#22d3ee', desc: '當前主流：乾淨數位繪、高飽和', keywords: 'contemporary OCG digital illustration, crisp rendering, saturated colours, elaborate mechanical detail' },
  { value: 'dark_fantasy', label: '黑暗奇幻', swatch: '#7c3aed', desc: '哥德、魔法陣、低光高對比', keywords: 'gothic dark fantasy illustration, glowing arcane summoning circle, chiaroscuro lighting, ominous mood' },
  { value: 'mecha', label: '機械神族', swatch: '#94a3b8', desc: '硬表面、金屬反射、科幻', keywords: 'hard-surface mecha design, polished metal reflections, sci-fi panel lining, industrial lighting' },
  { value: 'ukiyoe', label: '浮世繪', swatch: '#f97316', desc: '和風線刻、平塗、波浪紋', keywords: 'ukiyo-e woodblock aesthetic, flat inked planes, stylised wave and cloud motifs, washi paper grain' },
  { value: 'anime_hero', label: '動畫英雄', swatch: '#f472b6', desc: '動畫版質感，明亮英雄光', keywords: 'anime series hero rendering, bright heroic key light, clean cel shading, triumphant pose energy' },
];

const fields: FieldDef[] = [
  { id: 'frame_type', label: '卡片類型', group: 'subject', impact: 'high',
    hint: '卡框顏色與整張卡的氣質都由這格決定，影響最大。',
    control: { kind: 'chips', options: FRAMES }, aiFillable: false, default: 'synchro' },
  { id: 'name', label: '卡名', group: 'subject', impact: 'high',
    hint: '印在頂部，也是生圖的主體名稱。',
    control: { kind: 'text' }, aiFillable: false, default: '蒼穹誓約龍騎士' },
  { id: 'anatomy', label: '生物構造 / 外型', group: 'subject', impact: 'high',
    hint: '遊戲王怪獸常常不是人形。這格講清楚，AI 才不會畫成普通角色。',
    control: { kind: 'textarea', rows: 3 }, aiFillable: true,
    aiInstruction: 'an imaginative creature anatomy invented by the AI',
    default: '身披秘銀重甲的龍騎士，背後是四片由光構成的能量羽翼，右臂融合成巨大的龍顎' },
  { id: 'pose', label: '動作', group: 'subject', impact: 'high',
    hint: '決定氣勢。遊戲王插圖多半是「技能發動的瞬間」。',
    control: { kind: 'textarea', rows: 2 }, aiFillable: true,
    aiInstruction: 'the climactic instant of an attack', default: '俯衝而下，長槍劃出一道撕裂天空的光痕' },
  { id: 'expression', label: '神情', group: 'subject', impact: 'mid',
    hint: '非人形怪獸也可以有神情（眼睛的光、姿態的氣場）。',
    control: { kind: 'text' }, aiFillable: true, aiInstruction: 'a fitting demeanour', default: '雙眼燃著冷藍色的火，面無表情' },

  { id: 'bg_setting', label: '地點', group: 'scene', impact: 'high',
    hint: '留空時遊戲王風格最容易變成一團黑霧。建議填。',
    control: { kind: 'text' }, aiFillable: true, aiInstruction: 'a dramatic otherworldly location',
    default: '崩塌中的天空神殿' },
  { id: 'bg_details', label: '背景細節', group: 'scene', impact: 'mid',
    hint: '破碎的石柱、漂浮的符文 —— 這些讓背景不空。',
    control: { kind: 'textarea', rows: 2 }, aiFillable: true, aiInstruction: 'supporting background details',
    default: '漂浮的碎石、斷裂的立柱、環繞的古代符文環' },
  { id: 'bg_atmosphere', label: '氛圍', group: 'scene', impact: 'mid',
    hint: '情緒基調。',
    control: { kind: 'textarea', rows: 2 }, aiFillable: true, aiInstruction: 'an ominous epic atmosphere',
    default: '末日般的壓迫感，空氣中滿是靜電' },
  { id: 'summon_fx', label: '召喚特效', group: 'scene', impact: 'mid',
    hint: '遊戲王的招牌視覺。選對了整張卡立刻「像遊戲王」。',
    control: { kind: 'select', options: [
      { value: 'none', label: '無', keywords: '' },
      { value: 'circle', label: '魔法陣', keywords: 'an intricate glowing summoning circle inscribed beneath the subject' },
      { value: 'synchro_rings', label: '同步光環', keywords: 'concentric green synchro light rings passing through the subject' },
      { value: 'xyz_portal', label: '超量黑洞', keywords: 'a swirling black overlay-network galaxy portal below' },
      { value: 'link_arrows', label: '連結箭頭', keywords: 'luminous link arrows radiating outward in a circuit pattern' },
      { value: 'shatter', label: '次元碎裂', keywords: 'reality shattering like glass around the subject, dimensional fracture shards' },
    ] }, aiFillable: false, default: 'synchro_rings' },
  { id: 'camera', label: '鏡頭', group: 'scene', impact: 'low',
    hint: '記得插圖窗是正方形，構圖要能塞進方框。',
    control: { kind: 'select', options: [
      { value: 'low', label: '低角度仰視', keywords: 'low-angle framing, subject towering over the viewer' },
      { value: 'centered', label: '正面中心構圖', keywords: 'centred symmetrical composition' },
      { value: 'diag', label: '對角動勢', keywords: 'strong diagonal composition cutting across the square frame' },
      { value: 'closeup', label: '上半身特寫', keywords: 'upper-body close crop filling the square frame' },
    ] }, aiFillable: false, default: 'diag' },

  { id: 'art_style', label: '美術風格', group: 'style', impact: 'high',
    hint: '先決定這格，其他才有意義。',
    control: { kind: 'chips', options: STYLES }, aiFillable: false, default: 'dark_fantasy' },
  { id: 'attribute', label: '屬性', group: 'style', impact: 'mid',
    hint: '右上角屬性球，同時影響光效主色。',
    control: { kind: 'chips', options: [
      { value: 'light', label: '光 LIGHT', swatch: '#fde68a', keywords: 'LIGHT attribute, radiant golden-white holy glow' },
      { value: 'dark', label: '闇 DARK', swatch: '#4c1d95', keywords: 'DARK attribute, violet-black shadow aura' },
      { value: 'earth', label: '地 EARTH', swatch: '#92400e', keywords: 'EARTH attribute, ochre stone and soil tones' },
      { value: 'water', label: '水 WATER', swatch: '#0ea5e9', keywords: 'WATER attribute, cold blue currents' },
      { value: 'fire', label: '炎 FIRE', swatch: '#dc2626', keywords: 'FIRE attribute, roaring crimson flame' },
      { value: 'wind', label: '風 WIND', swatch: '#10b981', keywords: 'WIND attribute, emerald gale currents' },
      { value: 'divine', label: '神 DIVINE', swatch: '#f59e0b', keywords: 'DIVINE attribute, overwhelming sacred radiance' },
    ] }, aiFillable: false, default: 'light' },
  { id: 'palette', label: '色彩走向', group: 'style', impact: 'mid',
    hint: '想跟屬性反著走就改這格。',
    control: { kind: 'select', options: [
      { value: 'auto', label: '跟著屬性走', keywords: '' },
      { value: 'high_key', label: '高明度', keywords: 'high-key luminous palette' },
      { value: 'low_key', label: '低明度', keywords: 'low-key shadow-heavy palette with few highlights' },
      { value: 'metallic', label: '金屬質感', keywords: 'metallic gold and gunmetal palette' },
      { value: 'neon', label: '霓虹對比', keywords: 'neon accent colours against desaturated base' },
    ] }, aiFillable: false, default: 'low_key' },

  { id: 'level', label: '星數 / 階級 / LINK', group: 'cardface', impact: 'low',
    hint: '卡名下方那排星星。',
    control: { kind: 'number', min: 1, max: 12, step: 1 }, aiFillable: true, aiInstruction: 'a fitting level', default: '8' },
  { id: 'monster_type', label: '種族 / 類型', group: 'cardface', impact: 'low',
    hint: '插圖窗下方的方括號那一行。',
    control: { kind: 'text', placeholder: '[戰士族／同步／效果]' }, aiFillable: true,
    aiInstruction: 'a fitting type line', default: '[龍族／同步／效果]' },
  { id: 'effect_text', label: '效果文字', group: 'cardface', impact: 'low',
    hint: '卡面文字，對插圖沒影響。適合丟給 AI。',
    control: { kind: 'textarea', rows: 4 }, aiFillable: true,
    aiInstruction: 'a plausible multi-clause Yu-Gi-Oh effect text in Traditional Chinese',
    default: '調整＋調整以外的怪獸1隻以上\n①：這張卡attack時，對方不能發動卡的效果。\n②：這張卡被破壞送去墓地的場合可以發動。從卡組把1隻「誓約」怪獸特殊召喚。' },
  { id: 'pendulum_text', label: '靈擺效果', group: 'cardface', impact: 'low',
    hint: '只有靈擺卡需要，可留空。',
    control: { kind: 'textarea', rows: 2 }, aiFillable: true, aiInstruction: 'a pendulum effect', default: '' },
  { id: 'atk', label: 'ATK', group: 'cardface', impact: 'low', hint: '右下角攻擊力。',
    control: { kind: 'text' }, aiFillable: true, aiInstruction: 'a balanced ATK', default: '3000' },
  { id: 'def', label: 'DEF', group: 'cardface', impact: 'low', hint: '右下角守備力。',
    control: { kind: 'text' }, aiFillable: true, aiInstruction: 'a balanced DEF', default: '2500' },
  { id: 'set_code', label: '卡包編號', group: 'cardface', impact: 'low', hint: '左下角編號。',
    control: { kind: 'text' }, aiFillable: false, default: 'TD01-JP001' },
  { id: 'illustrator', label: '繪師署名', group: 'cardface', impact: 'low', hint: '署名。',
    control: { kind: 'text' }, aiFillable: false, default: 'Illus. 童設計' },

  { id: 'output_target', label: '輸出目標', group: 'finish', impact: 'high',
    hint: '遊戲王插圖窗是正方形，選「只要插圖」時會自動要求 1:1 構圖。',
    control: { kind: 'select', options: [
      { value: 'artwork', label: '只要插圖（正方形）', keywords: 'a standalone square 1:1 card illustration with no frame, no border and no text' },
      { value: 'full_card', label: '整張實體卡', keywords: 'a complete Yu-Gi-Oh style collectible card including frame, name plate, type line, effect text box and ATK/DEF line' },
      { value: 'mockup', label: '實體卡情境照', keywords: 'a product photograph of the physical card tilted under studio lighting, visible holographic refraction' },
    ] }, aiFillable: false, default: 'artwork' },
  { id: 'rarity', label: '稀有度', group: 'finish', impact: 'high',
    hint: '決定卡名字體與箔面層次。',
    control: { kind: 'chips', options: [
      { value: 'common', label: 'N 普卡', desc: '黑字卡名、無箔', keywords: 'common rarity, flat black card name, no foil' },
      { value: 'super', label: 'SR 金字', desc: '金色卡名 + 插圖箔', keywords: 'super rare, gold foil card name with holographic artwork' },
      { value: 'ultra', label: 'UR 彩字', desc: '彩色卡名 + 全箔', keywords: 'ultra rare, prismatic card name with full holographic treatment' },
      { value: 'secret', label: 'SE 隱藏', desc: '對角線稜鏡反光', keywords: 'secret rare, diagonal prismatic refraction across the whole card' },
      { value: 'ghost', label: 'GR 浮雕', desc: '立體浮雕、幻影感', keywords: 'ghost rare, embossed three-dimensional spectral artwork' },
    ] }, aiFillable: false, default: 'ultra' },
  { id: 'foil', label: '箔面工藝', group: 'finish', impact: 'mid',
    hint: '只有實體卡 / 情境照模式看得出來。',
    control: { kind: 'chips', options: [
      { value: 'none', label: '無箔', swatch: '#64748b', keywords: 'matte finish' },
      { value: 'holo', label: '標準 Holo', swatch: '#67e8f9', keywords: 'standard holographic foil' },
      { value: 'prismatic', label: '稜鏡箔', swatch: '#a78bfa', keywords: 'prismatic rainbow refraction foil' },
      { value: 'relief', label: '浮雕箔', swatch: '#e2e8f0', keywords: 'raised relief embossed foil' },
    ] }, aiFillable: false, default: 'prismatic' },
];

function build(values: Record<string, string>, modes: Record<string, FillMode>) {
  const r = makeResolver(fields, values, modes);
  const kw = (id: string) => keywordsOf(fields, id, values[id] ?? '');
  const p = new PromptWriter();
  const target = values.output_target || 'artwork';

  p.lit(`${kw('output_target')}. `);
  p.lit('Card class: '); p.field('frame_type', kw('frame_type')); p.lit('. ');
  const nm = r('name');
  p.lit('Subject: a monster named '); p.field('name', `"${nm.value}"`, nm.ai); p.lit('. ');

  for (const [id, lead] of [['anatomy', 'Anatomy and design'], ['pose', 'Pose'], ['expression', 'Demeanour'],
    ['bg_setting', 'Setting'], ['bg_details', 'Background detail'], ['bg_atmosphere', 'Atmosphere']] as const) {
    const v = r(id);
    if (v.value) { p.lit(`${lead}: `); p.field(id, v.value, v.ai); p.lit('. '); }
  }
  if (values.summon_fx !== 'none') { p.lit('Summoning FX: '); p.field('summon_fx', kw('summon_fx')); p.lit('. '); }
  p.lit('Camera: '); p.field('camera', kw('camera')); p.lit('. ');
  p.lit('Art direction: '); p.field('art_style', kw('art_style')); p.lit('. ');
  p.lit('Attribute: '); p.field('attribute', kw('attribute')); p.lit('. ');
  if (values.palette !== 'auto') { p.lit('Palette: '); p.field('palette', kw('palette')); p.lit('. '); }
  p.lit('Print treatment: '); p.field('rarity', kw('rarity')); p.lit(', '); p.field('foil', kw('foil')); p.lit('. ');

  if (target !== 'artwork') {
    p.lit('Printed copy — name '); p.field('name', `"${nm.value}"`, nm.ai);
    p.lit(', level '); p.field('level', r('level').value, r('level').ai);
    p.lit(', type line '); p.field('monster_type', r('monster_type').value, r('monster_type').ai);
    p.lit(', ATK '); p.field('atk', r('atk').value, r('atk').ai);
    p.lit(' / DEF '); p.field('def', r('def').value, r('def').ai);
    p.lit('. All printed text must be legible Traditional Chinese. ');
  } else {
    p.lit('Square 1:1 composition, no card frame, no borders, no printed text anywhere. ');
  }
  p.lit('Masterpiece quality, 8K, intricate rendering, coherent anatomy.');

  const j = new JsonWriter();
  j.open(null);
  j.kv('schema', 'prompt-studio/yugioh-card@1');
  j.kv('output_target', kw('output_target'), 'output_target');
  j.kv('card_class', kw('frame_type'), 'frame_type');
  j.open('subject');
  j.kv('name', nm.value, 'name', nm.ai);
  j.kv('anatomy', r('anatomy').value, 'anatomy', r('anatomy').ai);
  j.kv('pose', r('pose').value, 'pose', r('pose').ai);
  j.kv('demeanour', r('expression').value, 'expression', r('expression').ai);
  j.close();
  j.open('scene');
  j.kv('setting', r('bg_setting').value, 'bg_setting', r('bg_setting').ai);
  j.kv('details', r('bg_details').value, 'bg_details', r('bg_details').ai);
  j.kv('atmosphere', r('bg_atmosphere').value, 'bg_atmosphere', r('bg_atmosphere').ai);
  j.kv('summoning_fx', kw('summon_fx'), 'summon_fx');
  j.kv('camera', kw('camera'), 'camera');
  j.close();
  j.open('style');
  j.kv('art_direction', kw('art_style'), 'art_style');
  j.kv('attribute', kw('attribute'), 'attribute');
  j.kv('palette', kw('palette'), 'palette');
  j.close();
  j.open('print');
  j.kv('rarity', kw('rarity'), 'rarity');
  j.kv('foil', kw('foil'), 'foil');
  j.kv('aspect_ratio', target === 'artwork' ? '1:1 (square artwork window)' : '59:86');
  j.close();
  if (target !== 'artwork') {
    j.open('printed_copy');
    j.kv('level', r('level').value, 'level', r('level').ai);
    j.kv('type_line', r('monster_type').value, 'monster_type', r('monster_type').ai);
    j.kv('effect_text', r('effect_text').value.replace(/\n/g, ' / '), 'effect_text', r('effect_text').ai);
    j.kv('pendulum_text', r('pendulum_text').value, 'pendulum_text', r('pendulum_text').ai);
    j.kv('atk', r('atk').value, 'atk', r('atk').ai);
    j.kv('def', r('def').value, 'def', r('def').ai);
    j.kv('set_code', values.set_code, 'set_code');
    j.kv('illustrator', values.illustrator, 'illustrator');
    j.close();
  }
  j.kv('negative', BASE_NEGATIVE, undefined, false, false);
  j.close('}', false);

  return {
    segments: p.segments,
    jsonLines: j.finish(),
    plain: p.text,
    negative: BASE_NEGATIVE + (target === 'artwork' ? ', card frame, borders, any text' : ''),
  };
}

fields.push(classicFinishField('yugioh'));

export const yugiohSystem: CardSystem = {
  id: 'yugioh',
  baseImage: '/base/yugioh.avif',
  label: 'Yu-Gi-Oh!',
  sublabel: '遊戲王 OCG',
  accent: '#a855f7',
  ratio: '59 × 86 mm',
  zones,
  fields,
  build,
};
