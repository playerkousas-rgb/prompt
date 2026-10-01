import { BASE_NEGATIVE, JsonWriter, PromptWriter, keywordsOf, makeResolver } from '../../schema/builder';
import { referenceFields } from '../reference';
import type { CardSystem, FieldDef, FillMode, ZoneDef } from '../../schema/types';

// ---------------------------------------------------------------------------
// 卡面示意圖：630 x 880 viewBox，比例同實體卡 63 x 88 mm
// ---------------------------------------------------------------------------
const zones: ZoneDef[] = [
  { id: 'stage', label: '階段', fieldIds: ['stage'], x: 25, y: 38, w: 82, h: 26 },
  { id: 'name', label: '卡名', fieldIds: ['name', 'subject_type'], x: 124, y: 44, w: 286, h: 32 },
  { id: 'hp', label: 'HP', fieldIds: ['hp'], x: 434, y: 46, w: 106, h: 30 },
  { id: 'type', label: '屬性', fieldIds: ['energy_type'], x: 547, y: 40, w: 40, h: 36 },
  {
    id: 'art',
    label: '插圖窗（AI 生圖的主戰場）',
    fieldIds: [
      'ref_use', 'ref_keep', 'ref_strength',
      'subject_type', 'name', 'partner', 'pose', 'expression', 'outfit',
      'bg_setting', 'bg_details', 'bg_atmosphere', 'time_light', 'camera',
      'art_style', 'color_mood', 'line_quality', 'energy_type', 'detail_level',
    ],
    x: 22, y: 90, w: 585, h: 670, tone: 'soft',
  },
  { id: 'ability', label: '特性', fieldIds: ['ability_name', 'ability_text'], x: 93, y: 430, w: 445, h: 142 },
  {
    id: 'attack1', label: '招式 1',
    fieldIds: ['attack1_cost', 'attack1_name', 'attack1_dmg', 'attack1_text'],
    x: 47, y: 598, w: 519, h: 48,
  },
  {
    id: 'attack2', label: '招式 2',
    fieldIds: ['attack2_cost', 'attack2_name', 'attack2_dmg', 'attack2_text'],
    x: 47, y: 676, w: 519, h: 74,
  },
  {
    id: 'weak', label: '弱點 / 抵抗 / 撤退',
    fieldIds: ['weakness', 'resistance', 'retreat'],
    x: 38, y: 765, w: 561, h: 30,
  },
  { id: 'flavor', label: '風味文字', fieldIds: ['flavor'], x: 319, y: 808, w: 274, h: 34 },
  { id: 'setnum', label: '編號 / 繪師', fieldIds: ['set_number', 'illustrator'], x: 41, y: 810, w: 106, h: 48 },
  { id: 'frame', label: '整張卡（卡框 / 箔面 / 輸出形式）', fieldIds: ['rarity', 'foil', 'border', 'output_target'], x: 8, y: 8, w: 614, h: 864, tone: 'soft' },
];

// ---------------------------------------------------------------------------

const ENERGY = [
  { value: 'fire', label: '火', swatch: '#f05a28', keywords: 'Fire type, molten orange and crimson flame aura, ember particles, heat distortion' },
  { value: 'grass', label: '草', swatch: '#4aa02c', keywords: 'Grass type, verdant green leaf aura, drifting petals and pollen motes' },
  { value: 'water', label: '水', swatch: '#3b9ddd', keywords: 'Water type, cyan and deep blue aqua aura, splashing droplets, caustic light' },
  { value: 'lightning', label: '電', swatch: '#f5c518', keywords: 'Lightning type, electric yellow arcs, crackling plasma filaments' },
  { value: 'psychic', label: '超能', swatch: '#9a4fd1', keywords: 'Psychic type, violet and magenta telekinetic aura, floating geometric glyphs' },
  { value: 'darkness', label: '惡', swatch: '#2d3a45', keywords: 'Darkness type, inky black-purple miasma, cold rim light, smoky tendrils' },
  { value: 'fighting', label: '格鬥', swatch: '#b5562a', keywords: 'Fighting type, earthen brown-orange shockwave, cracked ground, dust bursts' },
  { value: 'metal', label: '鋼', swatch: '#8f9aa6', keywords: 'Metal type, brushed steel silver sheen, sparks, hard specular highlights' },
  { value: 'fairy', label: '妖精', swatch: '#ec6fa6', keywords: 'Fairy type, soft pink glow, glittering bokeh, pastel bloom' },
  { value: 'dragon', label: '龍', swatch: '#b08a3e', keywords: 'Dragon type, antique gold and deep indigo aura, ancient rune swirls' },
  { value: 'ice', label: '冰', swatch: '#7fd4e8', keywords: 'Ice type, pale cyan frost aura, swirling ice crystals and snow flurries' },
  { value: 'ground', label: '地面', swatch: '#c2994a', keywords: 'Ground type, ochre dust storm, erupting earth pillars, grit in the air' },
  { value: 'ghost', label: '幽靈', swatch: '#6b5b8a', keywords: 'Ghost type, pale blue wisp flames, warped shadows, creeping fog' },
  { value: 'colorless', label: '無', swatch: '#d8d2c6', keywords: 'Colorless type, neutral ivory and silver wind aura, feather motes' },
];

const ART_STYLES = [
  {
    value: 'modern_tcg', label: '現代官方 TCG', swatch: '#22d3ee',
    desc: '當前主流卡面：乾淨線條、鮮豔賽璐珞上色、滿版動態構圖',
    keywords: 'official modern Pokémon TCG illustration, crisp clean linework, vibrant cel shading, full-bleed dynamic composition, bright saturated palette',
  },
  {
    value: 'sar', label: '特別插畫稀有 SAR', swatch: '#f0abfc',
    desc: '最貴的那種卡：敘事感場景、角色與寶可夢同框、景深明顯',
    keywords: 'Special Art Rare full-art illustration, cinematic storytelling scene, character and Pokémon sharing a quiet moment, shallow depth of field, painterly background, lavish detail',
  },
  {
    value: 'retro90s', label: '90 年代復古', swatch: '#fbbf24',
    desc: '初代卡牌感：杉森建水彩、柔和筆觸、低彩度',
    keywords: 'vintage 1990s Pokémon card art, Ken Sugimori watercolor style, soft gouache texture, muted retro palette, visible paper grain',
  },
  {
    value: 'movie_paint', label: '劇場版厚塗', swatch: '#a78bfa',
    desc: '電影海報質感：厚塗體積光、高對比、戲劇性',
    keywords: 'theatrical anime movie poster painting, thick painterly rendering, volumetric god rays, high contrast dramatic lighting, epic scale',
  },
  {
    value: 'manga_ink', label: '漫畫網點', swatch: '#e2e8f0',
    desc: '黑白漫畫感：粗墨線、網點陰影、速度線',
    keywords: 'Japanese manga ink illustration, bold brush outlines, screentone shading, dynamic speed lines, limited spot color',
  },
  {
    value: 'watercolor', label: '透明水彩', swatch: '#67e8f9',
    desc: '留白與暈染，適合安靜、溫柔的卡',
    keywords: 'delicate watercolor illustration, wet-on-wet bleeding edges, generous white space, translucent washes, gentle mood',
  },
];

const FOILS = [
  { value: 'none', label: '無箔面', swatch: '#64748b', desc: '一般卡，純插圖質感', keywords: 'matte non-foil print finish' },
  { value: 'holo', label: '傳統 Holo', swatch: '#67e8f9', desc: '只有插圖窗閃，經典款', keywords: 'classic holographic foil confined to the artwork window, rainbow sheen' },
  { value: 'cosmos', label: '星雲箔', swatch: '#818cf8', desc: '星點漩渦狀反光', keywords: 'cosmos holofoil pattern, swirling galaxy speckle refraction' },
  { value: 'rainbow', label: '彩虹箔', swatch: '#f472b6', desc: '整張漸層彩虹，夢幻', keywords: 'full-card rainbow hyper foil, pastel prismatic gradient across the entire surface' },
  { value: 'gold', label: '金屬燙金', swatch: '#eab308', desc: '金屬卡身 + 蝕刻邊框', keywords: 'solid gold metallic card stock, etched gilded ornamentation, heavy specular reflections' },
  { value: 'textured', label: '壓紋浮雕', swatch: '#94a3b8', desc: '摸得到的立體紋路', keywords: 'embossed textured foil, raised tactile relief catching the light' },
];

const RARITY = [
  { value: 'common', label: '普卡 ●', desc: '素面、無特效', keywords: 'common rarity, plain finish' },
  { value: 'rare_holo', label: '閃卡 ★', desc: '插圖窗閃箔', keywords: 'rare holo, foil artwork window' },
  { value: 'ultra', label: '超稀有 (全圖)', desc: '插圖滿版延伸到卡框外', keywords: 'ultra rare full-art card, artwork bleeding past the frame edges' },
  { value: 'secret', label: '隱藏稀有 (金卡)', desc: '金色卡身，編號超出總數', keywords: 'secret rare gold card, number exceeding the set total' },
  { value: 'illustration', label: '插畫稀有 IR', desc: '敘事場景，窄白框', keywords: 'illustration rare, narrative scene with a slim white border' },
];

const fields: FieldDef[] = [
  // ---- 主角 ----
  {
    id: 'subject_type', label: '主角類型', group: 'subject', impact: 'high',
    hint: '決定畫面主體是人還是寶可夢，會整個改變構圖重心。',
    control: { kind: 'select', options: [
      { value: 'trainer', label: '訓練家（人物）', keywords: 'a human Pokémon Trainer as the main subject' },
      { value: 'pokemon', label: '寶可夢（生物）', keywords: 'a Pokémon creature as the main subject' },
      { value: 'duo', label: '訓練家 + 夥伴同框', keywords: 'a human Trainer and their partner Pokémon sharing the frame as co-protagonists' },
    ] },
    essential: true,
    aiFillable: false, default: 'duo',
  },
  {
    id: 'name', label: '卡名 / 角色名', group: 'subject', impact: 'high',
    hint: '會印在卡片左上角，同時當作生圖的主體描述。',
    control: { kind: 'text', placeholder: '例如：貝登堡' },
    essential: true,
    aiFillable: false, default: '貝登堡',
  },
  {
    id: 'partner', label: '夥伴寶可夢', group: 'subject', impact: 'mid',
    hint: '留空就只畫主角；填了會多一隻生物在畫面裡搶戲。',
    control: { kind: 'text', placeholder: '例如：噴火龍' },
    aiFillable: true, aiInstruction: 'a partner Pokémon of the AI\'s own choosing that visually matches the trainer',
    default: '噴火龍',
  },
  {
    id: 'pose', label: '動作 / 姿勢', group: 'subject', impact: 'high',
    hint: '最影響「這張卡有沒有力量感」的一格。寫得越具體越穩。',
    control: { kind: 'textarea', rows: 2, placeholder: '右手作童軍三指敬禮，左手高舉精靈球' },
    essential: true,
    aiFillable: true, aiInstruction: 'a dynamic heroic pose chosen by the AI',
    default: '右手作童軍三指敬禮，左手高舉精靈球準備投擲',
  },
  {
    id: 'expression', label: '表情', group: 'subject', impact: 'mid',
    hint: '決定卡的情緒基調：熱血、冷靜、還是溫柔。',
    control: { kind: 'text', placeholder: '自信且充滿活力的認真神情' },
    aiFillable: true, aiInstruction: 'a fitting facial expression',
    default: '自信且充滿活力的認真神情',
  },
  {
    id: 'outfit', label: '服裝 / 外觀細節', group: 'subject', impact: 'low',
    hint: '細節加分項。不填 AI 也會自己配，但容易跑掉。',
    control: { kind: 'textarea', rows: 2, placeholder: '卡其色童軍制服、領巾、臂章' },
    aiFillable: true, aiInstruction: 'an outfit that fits the character concept',
    default: '卡其色童軍制服、紅色領巾、繡有徽章的臂章',
  },

  // ---- 場景 ----
  {
    id: 'bg_setting', label: '地點', group: 'scene', impact: 'high',
    hint: '背景的骨架。空白時 AI 常常給你一片糊掉的漸層。',
    control: { kind: 'text', placeholder: '非洲草原上的廣闊平原' },
    essential: true,
    aiFillable: true, aiInstruction: 'an environment that complements the subject',
    default: '非洲草原上的廣闊平原',
  },
  {
    id: 'bg_details', label: '背景細節', group: 'scene', impact: 'mid',
    hint: '幫背景長出層次，避免後景空洞。',
    control: { kind: 'textarea', rows: 2, placeholder: '遠處有岩石、山丘與稀疏的金合歡樹' },
    aiFillable: true, aiInstruction: 'supporting background details',
    default: '遠處有岩石、山丘與稀疏的金合歡樹',
  },
  {
    id: 'bg_atmosphere', label: '氛圍', group: 'scene', impact: 'mid',
    hint: '情緒與空氣感，跟「光線」一起決定整張卡的調子。',
    control: { kind: 'textarea', rows: 2, placeholder: '充滿冒險與活力，風吹起草浪' },
    aiFillable: true, aiInstruction: 'an evocative atmosphere',
    default: '充滿冒險與活力，風吹起草浪，遠方有九尾奔跑',
  },
  {
    id: 'time_light', label: '光線', group: 'scene', impact: 'mid',
    hint: '光線選錯，再好的構圖也會變平。這格 CP 值很高。',
    control: { kind: 'select', options: [
      { value: 'golden', label: '黃金時刻', keywords: 'golden hour backlight, long warm shadows, glowing rim light' },
      { value: 'noon', label: '正午強光', keywords: 'harsh midday sun, crisp high-contrast shadows' },
      { value: 'blue', label: '藍調時刻', keywords: 'blue hour twilight, cool ambient light, soft gradient sky' },
      { value: 'neon', label: '夜晚霓虹', keywords: 'night scene lit by neon signage, saturated colored rim lights, wet reflections' },
      { value: 'storm', label: '暴風雨', keywords: 'stormy overcast light, lightning flashes, rain streaks' },
      { value: 'studio', label: '棚拍打光', keywords: 'clean studio key light with soft fill, product-shot clarity' },
    ] },
    aiFillable: false, default: 'golden',
  },
  {
    id: 'camera', label: '鏡頭角度', group: 'scene', impact: 'low',
    hint: '仰角讓角色變英雄，俯角讓角色變渺小。',
    control: { kind: 'select', options: [
      { value: 'hero_low', label: '低角度仰視（英雄感）', keywords: 'low-angle hero shot looking up at the subject' },
      { value: 'eye', label: '平視', keywords: 'eye-level framing' },
      { value: 'high', label: '高角度俯視', keywords: 'high-angle shot looking down' },
      { value: 'closeup', label: '胸上特寫', keywords: 'tight bust-up close-up, face dominating the frame' },
      { value: 'full', label: '全身', keywords: 'full-body composition with headroom' },
      { value: 'dutch', label: '傾斜運鏡', keywords: 'dramatic dutch-angle tilt' },
    ] },
    aiFillable: false, default: 'hero_low',
  },

  // ---- 畫風 ----
  {
    id: 'art_style', label: '美術風格', group: 'style', impact: 'high',
    hint: '全站影響力最大的一格。先選這個，再調其他。',
    control: { kind: 'chips', options: ART_STYLES },
    essential: true,
    aiFillable: false, default: 'sar',
  },
  {
    id: 'energy_type', label: '屬性', group: 'style', impact: 'high',
    hint: '不只印在右上角，還會決定整張卡的主色與光效顏色。',
    control: { kind: 'chips', options: ENERGY },
    essential: true,
    aiFillable: false, default: 'fire',
  },
  {
    id: 'color_mood', label: '色彩走向', group: 'style', impact: 'mid',
    hint: '和屬性疊加。想要反差配色（火屬性冷色調）就在這裡改。',
    control: { kind: 'select', options: [
      { value: 'auto', label: '跟著屬性走', keywords: '' },
      { value: 'warm', label: '暖色主導', keywords: 'warm-dominant palette, amber and crimson' },
      { value: 'cool', label: '冷色主導', keywords: 'cool-dominant palette, teal and indigo' },
      { value: 'complement', label: '互補色強對比', keywords: 'bold complementary colour clash, high chroma contrast' },
      { value: 'muted', label: '低彩度', keywords: 'desaturated muted palette, restrained tonal range' },
      { value: 'duotone', label: '雙色調', keywords: 'duotone colour scheme, two-hue limited palette' },
    ] },
    aiFillable: false, default: 'auto',
  },
  {
    id: 'line_quality', label: '線稿質感', group: 'style', impact: 'low',
    hint: '細節層級的調味。先把風格選對再碰這格。',
    control: { kind: 'select', options: [
      { value: 'clean', label: '乾淨細線', keywords: 'clean uniform thin linework' },
      { value: 'bold', label: '粗黑輪廓', keywords: 'bold heavy black outlines' },
      { value: 'painterly', label: '無線稿厚塗', keywords: 'lineless painterly rendering, forms defined by value' },
      { value: 'sketchy', label: '保留草稿筆觸', keywords: 'visible sketchy construction strokes' },
    ] },
    aiFillable: false, default: 'clean',
  },
  {
    id: 'detail_level', label: '細節密度', group: 'style', impact: 'low',
    hint: '太高會讓畫面吵雜，太低會空。預設即可。',
    control: { kind: 'select', options: [
      { value: 'balanced', label: '平衡', keywords: 'balanced detail density with clear focal hierarchy' },
      { value: 'dense', label: '極密（吵雜風險）', keywords: 'extremely dense intricate detail everywhere, maximalist' },
      { value: 'minimal', label: '簡約留白', keywords: 'minimal detail, generous negative space, strong silhouette' },
    ] },
    aiFillable: false, default: 'balanced',
  },

  // ---- 卡面資訊 ----
  {
    id: 'hp', label: 'HP', group: 'cardface', impact: 'low',
    hint: '只影響卡面右上角那串數字。',
    control: { kind: 'number', min: 10, max: 400, step: 10 },
    aiFillable: true, aiInstruction: 'a plausible HP value', default: '280',
  },
  {
    id: 'stage', label: '階段', group: 'cardface', impact: 'low',
    hint: '印在左上角的小標籤。',
    control: { kind: 'select', options: [
      { value: 'basic', label: 'BASIC 基礎' },
      { value: 'stage1', label: 'STAGE 1 一階' },
      { value: 'stage2', label: 'STAGE 2 二階' },
      { value: 'ex', label: 'ex' },
      { value: 'v', label: 'V / VMAX' },
      { value: 'trainer', label: 'TRAINER 支援者' },
    ] },
    aiFillable: false, default: 'ex',
  },
  {
    id: 'ability_name', label: '特性名稱', group: 'cardface', impact: 'low',
    hint: '留空或切成 AI 代填，讓 AI 編一個順口的名字。',
    control: { kind: 'text', placeholder: '不屈意志' },
    aiFillable: true, aiInstruction: 'an evocative ability name in Traditional Chinese',
    default: '不屈意志',
  },
  {
    id: 'ability_text', label: '特性說明', group: 'cardface', impact: 'low',
    hint: '卡面文字。對插圖幾乎沒影響，純粹為了成品完整。',
    control: { kind: 'textarea', rows: 2, placeholder: '只要這隻寶可夢在場上…' },
    aiFillable: true, aiInstruction: 'a short rules text matching the ability name',
    default: '只要這張卡在場上，我方全體寶可夢受到的傷害 -20。',
  },
  {
    id: 'attack1_cost', label: '招式 1 能量', group: 'cardface', impact: 'low',
    hint: '左側那排能量符號的數量與顏色。',
    control: { kind: 'text', placeholder: '火火無' },
    aiFillable: false, default: '火無',
  },
  {
    id: 'attack1_name', label: '招式 1 名稱', group: 'cardface', impact: 'low',
    hint: '可切 AI 代填。',
    control: { kind: 'text', placeholder: '烈焰衝鋒' },
    aiFillable: true, aiInstruction: 'a punchy attack name in Traditional Chinese',
    default: '草原衝鋒',
  },
  {
    id: 'attack1_dmg', label: '招式 1 傷害', group: 'cardface', impact: 'low',
    hint: '右側數字。',
    control: { kind: 'text', placeholder: '90' },
    aiFillable: true, aiInstruction: 'a balanced damage number', default: '70',
  },
  {
    id: 'attack1_text', label: '招式 1 說明', group: 'cardface', impact: 'low',
    hint: '卡面文字。',
    control: { kind: 'textarea', rows: 2 },
    aiFillable: true, aiInstruction: 'short attack rules text', default: '',
  },
  {
    id: 'attack2_cost', label: '招式 2 能量', group: 'cardface', impact: 'low',
    hint: '留空就只印一個招式。',
    control: { kind: 'text', placeholder: '火火火無' },
    aiFillable: false, default: '火火無',
  },
  {
    id: 'attack2_name', label: '招式 2 名稱', group: 'cardface', impact: 'low',
    hint: '可切 AI 代填。',
    control: { kind: 'text' },
    aiFillable: true, aiInstruction: 'a dramatic finisher attack name in Traditional Chinese',
    default: '夕陽誓約',
  },
  {
    id: 'attack2_dmg', label: '招式 2 傷害', group: 'cardface', impact: 'low',
    hint: '右側數字。',
    control: { kind: 'text' },
    aiFillable: true, aiInstruction: 'a high damage number', default: '180',
  },
  {
    id: 'attack2_text', label: '招式 2 說明', group: 'cardface', impact: 'low',
    hint: '卡面文字。',
    control: { kind: 'textarea', rows: 2 },
    aiFillable: true, aiInstruction: 'short attack rules text with a drawback',
    default: '這隻寶可夢下個回合無法使用此招式。',
  },
  {
    id: 'weakness', label: '弱點', group: 'cardface', impact: 'low',
    hint: '底部細條。',
    control: { kind: 'text', placeholder: '水 ×2' }, aiFillable: false, default: '水 ×2',
  },
  {
    id: 'resistance', label: '抵抗力', group: 'cardface', impact: 'low',
    hint: '底部細條。',
    control: { kind: 'text', placeholder: '草 -30' }, aiFillable: false, default: '草 -30',
  },
  {
    id: 'retreat', label: '撤退費用', group: 'cardface', impact: 'low',
    hint: '底部細條。',
    control: { kind: 'text', placeholder: '2' }, aiFillable: false, default: '2',
  },
  {
    id: 'flavor', label: '風味文字', group: 'cardface', impact: 'low',
    hint: '卡片最下方的斜體小字，最適合丟給 AI 代填。',
    control: { kind: 'textarea', rows: 2 },
    aiFillable: true, aiInstruction: 'a short poetic flavour line in Traditional Chinese',
    default: '當夕陽染紅草原，他的敬禮從未放下。',
  },
  {
    id: 'set_number', label: '卡號', group: 'cardface', impact: 'low',
    hint: '右下角編號。',
    control: { kind: 'text', placeholder: '201/165' }, aiFillable: false, default: '201/165',
  },
  {
    id: 'illustrator', label: '繪師署名', group: 'cardface', impact: 'low',
    hint: '左下角 Illus. 署名。',
    control: { kind: 'text', placeholder: 'Illus. Studio' }, aiFillable: false, default: 'Illus. 童設計',
  },

  // ---- 印刷工藝 ----
  {
    id: 'output_target', label: '輸出目標', group: 'finish', impact: 'high',
    hint: '決定 AI 是只畫插圖，還是連整張卡（卡框、文字框）一起畫出來。',
    control: { kind: 'select', options: [
      { value: 'artwork', label: '只要插圖', desc: '最乾淨，之後自己套卡框', keywords: 'a standalone character illustration with no card frame, no borders and no text' },
      { value: 'full_card', label: '整張實體卡', desc: '含卡框與文字，但 AI 很容易寫錯字', keywords: 'a complete physical collectible trading card including the printed frame, text boxes and typography' },
      { value: 'mockup', label: '實體卡情境照', desc: '手拿卡 / 桌面擺拍，用來做宣傳圖', keywords: 'a product photograph of the finished physical trading card held in a hand, shallow depth of field, realistic foil reflections' },
    ] },
    essential: true,
    aiFillable: false, default: 'artwork',
  },
  {
    id: 'rarity', label: '稀有度', group: 'finish', impact: 'high',
    hint: '影響構圖是否滿版、卡框形式與整體豪華感。',
    control: { kind: 'chips', options: RARITY },
    essential: true,
    aiFillable: false, default: 'illustration',
  },
  {
    id: 'foil', label: '箔面工藝', group: 'finish', impact: 'high',
    hint: '只有在「整張實體卡」或「情境照」模式下才看得出差別。',
    control: { kind: 'chips', options: FOILS },
    aiFillable: false, default: 'rainbow',
  },
  {
    id: 'border', label: '卡框', group: 'finish', impact: 'mid',
    hint: '白框 / 黑框 / 無框，直接改變卡的年代感。',
    control: { kind: 'select', options: [
      { value: 'yellow', label: '黃框（經典）', keywords: 'classic yellow card border' },
      { value: 'white', label: '白框（現代）', keywords: 'slim modern white border' },
      { value: 'black', label: '黑框', keywords: 'black bordered card frame' },
      { value: 'silver', label: '銀框', keywords: 'brushed silver metallic border' },
      { value: 'none', label: '無框滿版', keywords: 'borderless full-bleed artwork' },
    ] },
    aiFillable: false, default: 'white',
  },
];

// ---------------------------------------------------------------------------

function build(values: Record<string, string>, modes: Record<string, FillMode>) {
  const r = makeResolver(fields, values, modes);
  const kw = (id: string) => keywordsOf(fields, id, values[id] ?? '');
  const p = new PromptWriter();

  const target = values.output_target || 'artwork';
  const subjectType = values.subject_type || 'duo';
  const nm = r('name');
  const partner = r('partner');

  // --- 自然語言 prompt ---
  p.lit(`${kw('output_target')}. `);

  p.lit('Subject: ');
  p.field('subject_type', kw('subject_type'));
  if (nm.value) {
    p.lit(' named ');
    p.field('name', `"${nm.value}"`, nm.ai);
  }
  if (subjectType !== 'pokemon' && partner.value) {
    p.lit(', accompanied by ');
    p.field('partner', partner.value, partner.ai);
  }
  p.lit('. ');

  const pose = r('pose');
  if (pose.value) { p.lit('Pose: '); p.field('pose', pose.value, pose.ai); p.lit('. '); }
  const expr = r('expression');
  if (expr.value) { p.lit('Expression: '); p.field('expression', expr.value, expr.ai); p.lit('. '); }
  const outfit = r('outfit');
  if (outfit.value) { p.lit('Wardrobe: '); p.field('outfit', outfit.value, outfit.ai); p.lit('. '); }

  const setting = r('bg_setting');
  if (setting.value) { p.lit('Setting: '); p.field('bg_setting', setting.value, setting.ai); p.lit('. '); }
  const det = r('bg_details');
  if (det.value) { p.lit('Background detail: '); p.field('bg_details', det.value, det.ai); p.lit('. '); }
  const atmo = r('bg_atmosphere');
  if (atmo.value) { p.lit('Atmosphere: '); p.field('bg_atmosphere', atmo.value, atmo.ai); p.lit('. '); }

  p.lit('Lighting: '); p.field('time_light', kw('time_light')); p.lit('. ');
  p.lit('Camera: '); p.field('camera', kw('camera')); p.lit('. ');

  p.lit('Art direction: '); p.field('art_style', kw('art_style')); p.lit('. ');
  p.lit('Elemental identity: '); p.field('energy_type', kw('energy_type')); p.lit('. ');
  if (values.color_mood !== 'auto') { p.lit('Colour: '); p.field('color_mood', kw('color_mood')); p.lit('. '); }
  p.lit('Linework: '); p.field('line_quality', kw('line_quality')); p.lit('. ');
  p.lit('Detail: '); p.field('detail_level', kw('detail_level')); p.lit('. ');

  p.lit('Print treatment: '); p.field('rarity', kw('rarity'));
  p.lit(', '); p.field('foil', kw('foil'));
  p.lit(', '); p.field('border', kw('border')); p.lit('. ');

  if (target !== 'artwork') {
    const an = r('attack1_name');
    const an2 = r('attack2_name');
    const fl = r('flavor');
    p.lit('Printed card copy — card name ');
    p.field('name', `"${nm.value}"`, nm.ai);
    p.lit(', HP '); p.field('hp', r('hp').value, r('hp').ai);
    if (an.value) { p.lit(', first attack '); p.field('attack1_name', `"${an.value}"`, an.ai); }
    if (an2.value) { p.lit(', second attack '); p.field('attack2_name', `"${an2.value}"`, an2.ai); }
    if (fl.value) { p.lit(', flavour line '); p.field('flavor', `"${fl.value}"`, fl.ai); }
    p.lit('. All printed text must be legible Traditional Chinese. ');
  } else {
    p.lit('No card frame, no borders, no printed text anywhere in the image. ');
  }

  p.lit('Masterpiece quality, 8K, sharp focus, coherent anatomy, professional illustration.');

  // --- 結構化 JSON ---
  const j = new JsonWriter();
  j.open(null);
  j.kv('schema', 'prompt-studio/pokemon-card@1');
  j.kv('output_target', kw('output_target'), 'output_target');
  j.open('subject');
  j.kv('type', kw('subject_type'), 'subject_type');
  j.kv('name', nm.value, 'name', nm.ai);
  if (subjectType !== 'pokemon') j.kv('partner', partner.value, 'partner', partner.ai);
  j.kv('pose', pose.value, 'pose', pose.ai);
  j.kv('expression', expr.value, 'expression', expr.ai);
  j.kv('wardrobe', outfit.value, 'outfit', outfit.ai);
  j.close();
  j.open('scene');
  j.kv('setting', setting.value, 'bg_setting', setting.ai);
  j.kv('details', det.value, 'bg_details', det.ai);
  j.kv('atmosphere', atmo.value, 'bg_atmosphere', atmo.ai);
  j.kv('lighting', kw('time_light'), 'time_light');
  j.kv('camera', kw('camera'), 'camera');
  j.close();
  j.open('style');
  j.kv('art_direction', kw('art_style'), 'art_style');
  j.kv('elemental_identity', kw('energy_type'), 'energy_type');
  j.kv('colour', kw('color_mood'), 'color_mood');
  j.kv('linework', kw('line_quality'), 'line_quality');
  j.kv('detail_density', kw('detail_level'), 'detail_level');
  j.close();
  j.open('print');
  j.kv('rarity', kw('rarity'), 'rarity');
  j.kv('foil', kw('foil'), 'foil');
  j.kv('border', kw('border'), 'border');
  j.kv('aspect_ratio', '63:88');
  j.close();
  if (target !== 'artwork') {
    j.open('printed_copy');
    j.kv('stage', kw('stage'), 'stage');
    j.kv('hp', r('hp').value, 'hp', r('hp').ai);
    j.kv('ability_name', r('ability_name').value, 'ability_name', r('ability_name').ai);
    j.kv('ability_text', r('ability_text').value, 'ability_text', r('ability_text').ai);
    j.kv('attack_1', `${values.attack1_cost || ''} ${r('attack1_name').value} ${r('attack1_dmg').value}`.trim(), 'attack1_name', r('attack1_name').ai);
    j.kv('attack_2', `${values.attack2_cost || ''} ${r('attack2_name').value} ${r('attack2_dmg').value}`.trim(), 'attack2_name', r('attack2_name').ai);
    j.kv('weakness', values.weakness, 'weakness');
    j.kv('resistance', values.resistance, 'resistance');
    j.kv('retreat', values.retreat, 'retreat');
    j.kv('flavour', r('flavor').value, 'flavor', r('flavor').ai);
    j.kv('set_number', values.set_number, 'set_number');
    j.kv('illustrator', values.illustrator, 'illustrator');
    j.kv('language', 'Traditional Chinese, legible and correctly spelled');
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

fields.unshift(...referenceFields());

export const pokemonSystem: CardSystem = {
  id: 'pokemon',
  baseImages: [
    {
      id: 'duo',
      label: '雙人聯動',
      desc: '貝登堡 ＋ 夥伴寶可夢，火山戰鬥場景、滿版彩虹箔',
      src: '/base/pokemon-duo.avif',
    },
    {
      id: 'solo',
      label: '單人',
      desc: '貝登堡獨照，非洲草原黃金時刻、SAR 窄框',
      src: '/base/pokemon-solo.avif',
    },
  ],
  label: 'Pokémon',
  sublabel: '寶可夢 TCG',
  accent: '#f5c518',
  ratio: '63 × 88 mm',
  zones,
  fields,
  build,
};
