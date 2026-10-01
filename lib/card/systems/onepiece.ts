import { BASE_NEGATIVE, JsonWriter, PromptWriter, keywordsOf, makeResolver } from '../builder';
import { classicFinishField } from '../classic';
import type { CardSystem, FieldDef, FillMode, ZoneDef } from '../types';

const zones: ZoneDef[] = [
  { id: 'cost', label: '費用', fieldIds: ['cost'], x: 12, y: 14, w: 76, h: 68 },
  { id: 'attr', label: '屬性圖示', fieldIds: ['attribute'], x: 556, y: 12, w: 66, h: 64 },
  {
    id: 'art', label: '滿版插圖（OP 卡的插圖是整張滿版）',
    fieldIds: ['name', 'pose', 'expression', 'outfit', 'bg_setting', 'bg_details', 'bg_atmosphere', 'art_style', 'color', 'camera', 'haki'],
    x: 20, y: 20, w: 592, h: 512, tone: 'soft',
  },
  { id: 'power', label: '力量值', fieldIds: ['power'], x: 13, y: 94, w: 58, h: 56 },
  { id: 'counter', label: '反擊值', fieldIds: ['counter'], x: 13, y: 288, w: 36, h: 162 },
  { id: 'effect', label: '效果文字框', fieldIds: ['effect_text', 'trigger'], x: 40, y: 538, w: 556, h: 176 },
  { id: 'kind', label: '卡片種類帶', fieldIds: ['card_kind'], x: 126, y: 728, w: 390, h: 28 },
  { id: 'name', label: '卡名帶', fieldIds: ['name'], x: 88, y: 758, w: 464, h: 40 },
  { id: 'typeband', label: '特徵帶', fieldIds: ['tribe'], x: 167, y: 801, w: 318, h: 27 },
  { id: 'meta', label: '卡號 / 繪師', fieldIds: ['set_number', 'illustrator'], x: 487, y: 803, w: 122, h: 26 },
  { id: 'frame', label: '卡框 / 箔面', fieldIds: ['rarity', 'foil'], x: 6, y: 6, w: 618, h: 868, tone: 'soft' },
];

const COLORS = [
  { value: 'red', label: '紅 Red', swatch: '#d32f2f', keywords: 'red deck identity, aggressive crimson colour scheme, fiery impact' },
  { value: 'green', label: '綠 Green', swatch: '#2e7d32', keywords: 'green deck identity, verdant emerald colour scheme' },
  { value: 'blue', label: '藍 Blue', swatch: '#1565c0', keywords: 'blue deck identity, cool oceanic colour scheme' },
  { value: 'purple', label: '紫 Purple', swatch: '#6a1b9a', keywords: 'purple deck identity, regal violet colour scheme' },
  { value: 'black', label: '黑 Black', swatch: '#263238', keywords: 'black deck identity, shadowy monochrome colour scheme' },
  { value: 'yellow', label: '黃 Yellow', swatch: '#f9a825', keywords: 'yellow deck identity, radiant golden colour scheme' },
];

const STYLES = [
  { value: 'oda_spread', label: '尾田彩頁', swatch: '#f59e0b', desc: '漫畫彩色跨頁感：鮮豔平塗、粗墨線', keywords: 'Eiichiro Oda colour spread style, bold ink contours, flat vivid comic colouring, playful exaggerated proportions' },
  { value: 'alt_art', label: '異畫 Alt Art', swatch: '#ec4899', desc: '最搶手的款式：電影感場景、角色佔滿整張', keywords: 'One Piece Card Game alternate art, cinematic full-bleed scene, character dominating the frame, lavish rendering' },
  { value: 'anime_cel', label: '動畫賽璐珞', swatch: '#22d3ee', desc: '電視動畫質感：乾淨上色、明確陰影塊', keywords: 'TV anime cel-shaded rendering, clean flat shadows, broadcast animation look' },
  { value: 'manga_bw', label: '黑白漫畫', swatch: '#e2e8f0', desc: '網點與速度線，單色重點', keywords: 'black and white manga page style, screentone, dramatic speed lines, single spot colour accent' },
  { value: 'oil_epic', label: '史詩厚塗', swatch: '#a78bfa', desc: '油畫筆觸、海戰場面', keywords: 'epic oil-painted rendering, visible brush strokes, stormy naval battle grandeur' },
];

const fields: FieldDef[] = [
  { id: 'card_kind', label: '卡片種類', group: 'subject', impact: 'high',
    hint: '領航者 / 角色 / 事件 / 場地，構圖與卡框完全不同。',
    control: { kind: 'select', options: [
      { value: 'leader', label: 'LEADER 領航者', keywords: 'Leader card layout, horizontal emphasis, commanding portrait' },
      { value: 'character', label: 'CHARACTER 角色', keywords: 'Character card layout, vertical action portrait' },
      { value: 'event', label: 'EVENT 事件', keywords: 'Event card layout, a dramatic moment rather than a posed portrait' },
      { value: 'stage', label: 'STAGE 場地', keywords: 'Stage card layout, the location itself is the subject' },
    ] }, aiFillable: false, default: 'character' },
  { id: 'name', label: '角色名', group: 'subject', impact: 'high',
    hint: '印在下方卡名帶，同時是生圖主體。',
    control: { kind: 'text' }, aiFillable: false, default: '貝登堡' },
  { id: 'pose', label: '動作', group: 'subject', impact: 'high',
    hint: 'OP 卡最重視動勢，這格決定整張卡的衝擊力。',
    control: { kind: 'textarea', rows: 2 }, aiFillable: true,
    aiInstruction: 'an explosive action pose chosen by the AI', default: '躍起揮拳，衣擺與披風被氣流掀起' },
  { id: 'expression', label: '表情', group: 'subject', impact: 'mid',
    hint: '熱血咆哮還是冷冽微笑，差很多。',
    control: { kind: 'text' }, aiFillable: true, aiInstruction: 'a fitting expression', default: '咧嘴大笑，眼神銳利' },
  { id: 'outfit', label: '服裝', group: 'subject', impact: 'mid',
    hint: 'OP 角色辨識度多半來自服裝與配件。',
    control: { kind: 'textarea', rows: 2 }, aiFillable: true, aiInstruction: 'a distinctive pirate outfit',
    default: '紅色外套、草帽、腰間繫著刀鞘' },
  { id: 'haki', label: '霸氣 / 能力特效', group: 'subject', impact: 'mid',
    hint: '加特效讓畫面有「必殺技」感。不要就留空。',
    control: { kind: 'select', options: [
      { value: 'none', label: '無特效', keywords: '' },
      { value: 'armament', label: '武裝色（黑化）', keywords: 'armament haki coating the limbs in glossy black with crackling dark energy' },
      { value: 'conqueror', label: '霸王色（黑雷）', keywords: 'conqueror haki shockwave, black lightning arcing through the air, overwhelming pressure' },
      { value: 'devil', label: '惡魔果實能力', keywords: 'surreal devil fruit power manifesting, impossible body transformation' },
      { value: 'impact', label: '純粹衝擊波', keywords: 'raw impact shockwave, shattered debris flying outward' },
    ] }, aiFillable: false, default: 'conqueror' },

  { id: 'bg_setting', label: '地點', group: 'scene', impact: 'high',
    hint: '甲板、島嶼、海王類腹中…背景是 OP 世界觀的一半。',
    control: { kind: 'text' }, aiFillable: true, aiInstruction: 'a vivid Grand Line location',
    default: '暴風中的海賊船甲板' },
  { id: 'bg_details', label: '背景細節', group: 'scene', impact: 'mid',
    hint: '幫後景長出層次。',
    control: { kind: 'textarea', rows: 2 }, aiFillable: true, aiInstruction: 'supporting background details',
    default: '斷裂的桅杆、翻飛的海賊旗、遠處的巨浪' },
  { id: 'bg_atmosphere', label: '氛圍', group: 'scene', impact: 'mid',
    hint: '情緒基調。',
    control: { kind: 'textarea', rows: 2 }, aiFillable: true, aiInstruction: 'an epic atmosphere',
    default: '緊張到極點的決戰前夕' },
  { id: 'camera', label: '鏡頭', group: 'scene', impact: 'low',
    hint: '魚眼與仰角是 OP 卡的常見手法。',
    control: { kind: 'select', options: [
      { value: 'low', label: '低角度仰視', keywords: 'low-angle hero framing' },
      { value: 'fisheye', label: '廣角魚眼', keywords: 'wide-angle fisheye distortion, exaggerated foreground fist' },
      { value: 'closeup', label: '特寫', keywords: 'tight close-up on the face' },
      { value: 'wide', label: '大遠景', keywords: 'sweeping wide establishing shot' },
    ] }, aiFillable: false, default: 'fisheye' },

  { id: 'art_style', label: '美術風格', group: 'style', impact: 'high',
    hint: '影響力最大的一格，先決定這個。',
    control: { kind: 'chips', options: STYLES }, aiFillable: false, default: 'alt_art' },
  { id: 'color', label: '卡片顏色', group: 'style', impact: 'high',
    hint: '不只是卡框顏色，整張畫面的主色都會跟著走。',
    control: { kind: 'chips', options: COLORS }, aiFillable: false, default: 'red' },
  { id: 'attribute', label: '屬性', group: 'style', impact: 'low',
    hint: '右上角的武器圖示。',
    control: { kind: 'select', options: [
      { value: 'slash', label: '斬 Slash', keywords: 'slash attribute, bladed weapon motif' },
      { value: 'strike', label: '打 Strike', keywords: 'strike attribute, blunt fist motif' },
      { value: 'ranged', label: '射 Ranged', keywords: 'ranged attribute, projectile motif' },
      { value: 'special', label: '特 Special', keywords: 'special attribute, arcane power motif' },
      { value: 'wisdom', label: '知 Wisdom', keywords: 'wisdom attribute, intellect motif' },
    ] }, aiFillable: false, default: 'strike' },

  { id: 'cost', label: '費用', group: 'cardface', impact: 'low', hint: '左上角圓形數字。',
    control: { kind: 'number', min: 0, max: 10, step: 1 }, aiFillable: true, aiInstruction: 'a balanced cost', default: '5' },
  { id: 'power', label: '力量值', group: 'cardface', impact: 'low', hint: '左側大數字。',
    control: { kind: 'text' }, aiFillable: true, aiInstruction: 'a balanced power value', default: '7000' },
  { id: 'counter', label: '反擊值', group: 'cardface', impact: 'low', hint: '力量值下方。',
    control: { kind: 'text' }, aiFillable: false, default: '1000' },
  { id: 'tribe', label: '特徵', group: 'cardface', impact: 'low', hint: '卡名下方那條窄帶。',
    control: { kind: 'text', placeholder: '草帽一夥/超新星' }, aiFillable: true,
    aiInstruction: 'fitting trait tags', default: '童軍團/探險家' },
  { id: 'effect_text', label: '效果文字', group: 'cardface', impact: 'low', hint: '卡面文字，對插圖沒影響。',
    control: { kind: 'textarea', rows: 3 }, aiFillable: true,
    aiInstruction: 'a short card effect in Traditional Chinese',
    default: '【登場時】抽 1 張卡，然後將手牌中 1 張卡放置到卡組底部。' },
  { id: 'trigger', label: 'Trigger 效果', group: 'cardface', impact: 'low', hint: '生命區觸發效果，可留空。',
    control: { kind: 'text' }, aiFillable: true, aiInstruction: 'a trigger effect', default: '' },
  { id: 'set_number', label: '卡號', group: 'cardface', impact: 'low', hint: '左下角編號。',
    control: { kind: 'text' }, aiFillable: false, default: 'OP09-001' },
  { id: 'illustrator', label: '繪師署名', group: 'cardface', impact: 'low', hint: '右下角署名。',
    control: { kind: 'text' }, aiFillable: false, default: 'Illus. 童設計' },

  { id: 'output_target', label: '輸出目標', group: 'finish', impact: 'high',
    hint: '只畫插圖最乾淨；整張卡會含文字但容易寫錯字。',
    control: { kind: 'select', options: [
      { value: 'artwork', label: '只要插圖', keywords: 'a standalone full-bleed character illustration with no card frame and no text' },
      { value: 'full_card', label: '整張實體卡', keywords: 'a complete One Piece Card Game card including frame, cost bubble, power value and effect text box' },
      { value: 'mockup', label: '實體卡情境照', keywords: 'a product photograph of the physical card, angled under studio light with visible foil refraction' },
    ] }, aiFillable: false, default: 'artwork' },
  { id: 'rarity', label: '稀有度', group: 'finish', impact: 'high',
    hint: '決定是否滿版、有無豪華邊框。',
    control: { kind: 'chips', options: [
      { value: 'c', label: 'C 普卡', desc: '素面', keywords: 'common rarity, plain print' },
      { value: 'r', label: 'R 稀有', desc: '局部箔', keywords: 'rare, partial foil treatment' },
      { value: 'sr', label: 'SR 超稀有', desc: '全箔、動態構圖', keywords: 'super rare, full foil with dynamic composition' },
      { value: 'sec', label: 'SEC 隱藏', desc: '最高規格、金屬質感', keywords: 'secret rare, premium metallic treatment, maximum visual density' },
      { value: 'alt', label: 'Alt Art 異畫', desc: '敘事滿版插圖', keywords: 'alternate art parallel, narrative full-bleed illustration with no frame intrusion' },
    ] }, aiFillable: false, default: 'alt' },
  { id: 'foil', label: '箔面工藝', group: 'finish', impact: 'mid',
    hint: '只有在實體卡 / 情境照模式才看得出來。',
    control: { kind: 'chips', options: [
      { value: 'none', label: '無箔', swatch: '#64748b', keywords: 'matte finish' },
      { value: 'standard', label: '標準箔', swatch: '#67e8f9', keywords: 'standard holographic foil' },
      { value: 'manga', label: '漫畫箔', swatch: '#f472b6', keywords: 'manga-panel foil overlay with printed halftone texture' },
      { value: 'gold', label: '燙金', swatch: '#eab308', keywords: 'gold hot-stamped accents' },
    ] }, aiFillable: false, default: 'manga' },
];

function build(values: Record<string, string>, modes: Record<string, FillMode>) {
  const r = makeResolver(fields, values, modes);
  const kw = (id: string) => keywordsOf(fields, id, values[id] ?? '');
  const p = new PromptWriter();
  const target = values.output_target || 'artwork';

  p.lit(`${kw('output_target')}. `);
  p.lit('Card type: '); p.field('card_kind', kw('card_kind')); p.lit('. ');
  const nm = r('name');
  p.lit('Subject: pirate-world character '); p.field('name', `"${nm.value}"`, nm.ai); p.lit('. ');

  for (const [id, lead] of [['pose', 'Pose'], ['expression', 'Expression'], ['outfit', 'Wardrobe'],
    ['bg_setting', 'Setting'], ['bg_details', 'Background detail'], ['bg_atmosphere', 'Atmosphere']] as const) {
    const v = r(id);
    if (v.value) { p.lit(`${lead}: `); p.field(id, v.value, v.ai); p.lit('. '); }
  }
  if (values.haki !== 'none') { p.lit('Power FX: '); p.field('haki', kw('haki')); p.lit('. '); }
  p.lit('Camera: '); p.field('camera', kw('camera')); p.lit('. ');
  p.lit('Art direction: '); p.field('art_style', kw('art_style')); p.lit('. ');
  p.lit('Colour identity: '); p.field('color', kw('color')); p.lit('. ');
  p.lit('Attribute motif: '); p.field('attribute', kw('attribute')); p.lit('. ');
  p.lit('Print treatment: '); p.field('rarity', kw('rarity')); p.lit(', '); p.field('foil', kw('foil')); p.lit('. ');

  if (target !== 'artwork') {
    p.lit('Printed copy — name '); p.field('name', `"${nm.value}"`, nm.ai);
    p.lit(', cost '); p.field('cost', r('cost').value, r('cost').ai);
    p.lit(', power '); p.field('power', r('power').value, r('power').ai);
    const eff = r('effect_text');
    if (eff.value) { p.lit(', effect '); p.field('effect_text', `"${eff.value}"`, eff.ai); }
    p.lit('. All printed text must be legible Traditional Chinese. ');
  } else {
    p.lit('No card frame, no borders, no printed text anywhere in the image. ');
  }
  p.lit('Masterpiece quality, 8K, bold composition, coherent anatomy.');

  const j = new JsonWriter();
  j.open(null);
  j.kv('schema', 'prompt-studio/onepiece-card@1');
  j.kv('output_target', kw('output_target'), 'output_target');
  j.kv('card_type', kw('card_kind'), 'card_kind');
  j.open('subject');
  j.kv('name', nm.value, 'name', nm.ai);
  j.kv('pose', r('pose').value, 'pose', r('pose').ai);
  j.kv('expression', r('expression').value, 'expression', r('expression').ai);
  j.kv('wardrobe', r('outfit').value, 'outfit', r('outfit').ai);
  j.kv('power_fx', kw('haki'), 'haki');
  j.close();
  j.open('scene');
  j.kv('setting', r('bg_setting').value, 'bg_setting', r('bg_setting').ai);
  j.kv('details', r('bg_details').value, 'bg_details', r('bg_details').ai);
  j.kv('atmosphere', r('bg_atmosphere').value, 'bg_atmosphere', r('bg_atmosphere').ai);
  j.kv('camera', kw('camera'), 'camera');
  j.close();
  j.open('style');
  j.kv('art_direction', kw('art_style'), 'art_style');
  j.kv('colour_identity', kw('color'), 'color');
  j.kv('attribute', kw('attribute'), 'attribute');
  j.close();
  j.open('print');
  j.kv('rarity', kw('rarity'), 'rarity');
  j.kv('foil', kw('foil'), 'foil');
  j.kv('aspect_ratio', '63:88');
  j.close();
  if (target !== 'artwork') {
    j.open('printed_copy');
    j.kv('cost', r('cost').value, 'cost', r('cost').ai);
    j.kv('power', r('power').value, 'power', r('power').ai);
    j.kv('counter', values.counter, 'counter');
    j.kv('traits', r('tribe').value, 'tribe', r('tribe').ai);
    j.kv('effect', r('effect_text').value, 'effect_text', r('effect_text').ai);
    j.kv('trigger', r('trigger').value, 'trigger', r('trigger').ai);
    j.kv('set_number', values.set_number, 'set_number');
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

fields.push(classicFinishField('onepiece'));

export const onePieceSystem: CardSystem = {
  id: 'onepiece',
  baseImage: '/base/onepiece.avif',
  label: 'One Piece',
  sublabel: '航海王卡牌',
  accent: '#ef4444',
  ratio: '63 × 88 mm',
  zones,
  fields,
  build,
};
