// ---------------------------------------------------------------------------
// 「經典格式」—— 完整保留 legacy/tcg-json-prompt-master.html (test1) 的 JSON 輸出
//
// ⚠️ 這個檔案是對 test1 `generateJSON()` 的忠實移植：
//    鍵的順序、預設值、各屬性的中文背景字典、甚至
//    "Please refer to the first image I uploaded." 這類
//    參考照片工作流的用語，全部一字不改。
//
//    要調整提示詞風格請去改 systems/*.ts 的新版輸出，不要動這裡。
// ---------------------------------------------------------------------------

import { BASE_NEGATIVE, JsonWriter, keywordsOf, makeResolver } from './builder';
import { REF_PHOTO_SENTENCE, referenceLines } from './reference';
import type { FieldDef, FillMode, JsonLine } from './types';

// --- test1 原封不動的字典 ---------------------------------------------------

const TYPE_BG: Record<string, string> = {
  草: '茂密原始叢林，發光藤蔓與巨大葉片包圍，綠色能量漩渦與漂浮孢子',
  火: '爆發中的火山岩漿地帶，滾燙橙紅熔岩河流，空中飛舞火花與熱浪扭曲',
  水: '暴雨中的海洋懸崖，巨浪拍打岩石，水柱與泡沫漩渦四濺',
  電: '雷雨交加的夜間都市天台，強烈藍紫色閃電不斷劈落，電弧粒子充滿空氣',
  超能: '扭曲的星際空間，破碎紫色時空裂縫與漂浮能量碎片',
  惡: '血紅滿月的古老廢棄城堡，黑暗霧氣與爬行的黑影',
  格鬥: '崩壞的古代競技場，石柱倒塌，地面布滿拳風衝擊波與裂痕',
  鋼: '金屬工廠內部，熔融鋼水與機械齒輪，藍白色火花四射',
  妖精: '夢幻粉紫色花海，漂浮魔法光球與彩虹光環',
  龍: '雲層之上的龍之山脈，金色龍捲風能量與巨大龍影',
  冰: '冰雪極地冰川與暴風雪，藍白色冰晶狂舞',
  地面: '乾燥沙漠峽谷，沙塵暴與土黃色能量柱噴發',
  幽靈: '陰森深夜墓園，藍色鬼火與扭曲黑影，濃霧籠罩',
};

const COLOR_BG: Record<string, string> = {
  紅: '燃燒的戰場與熊熊火焰，紅色衝擊波與破壞痕跡',
  綠: '茂密叢林與巨大植物，綠色藤蔓纏繞',
  藍: '暴風雨中的大海，巨浪與藍色水柱',
  紫: '神秘黑暗空間與紫色詭異能量',
  黑: '漆黑夜空與血月，黑暗影子',
  黃: '閃耀金色光芒與雷電，高速殘影',
};

const ATTR_BG: Record<string, string> = {
  LIGHT: '聖潔金色光芒與神聖粒子',
  DARK: '漆黑深淵與扭曲暗影',
  FIRE: '熊熊烈焰與熔岩爆炸',
  WATER: '深藍海洋與激流漩渦',
  WIND: '狂風暴雨與綠色風刃',
  EARTH: '古老岩石廢墟與大地裂痕',
  DIVINE: '神域空間與金色神光',
};

const RENDERING =
  'Vibrant cel-shaded anime style, high contrast, clean sharp linework, dramatic lighting, masterpiece, best quality, ultra detailed, strong motion lines, dynamic composition';

const DIMENSIONS =
  'Standard 63x88mm card ratio, full-bleed illustration with proper TCG borders';

const REF_PHOTO = REF_PHOTO_SENTENCE;

// ---------------------------------------------------------------------------
// frame_structure：test1 的 ui_elements 給了「卡面要印什麼」，但沒說「印成什麼樣」。
// 實測下來，招式列特別吃虧 —— 模型常常把能量費用當成文字印出來，
// 而不是畫成一顆顆屬性符號。這裡補上版面結構描述。
//
// 這是 ui_elements 之外的新鍵，test1 原有的欄位一行都沒動。
// 遊戲王不加 —— 那套的原始 prompt 本來就夠好。
// ---------------------------------------------------------------------------

const FRAME_STRUCTURE: Record<string, string[]> = {
  pokemon: [
    'Top bar: stage tag on the far left, card name centred in bold, HP value and the elemental type symbol on the right',
    'Artwork occupies the upper portion of the card and reads as the focal point',
    'Ability box: a red rounded "Ability" pill, the ability name in red beside it, rules text in black underneath',
    'Each move is its own full-width row: energy cost on the far left, move name in large bold type in the middle, damage number right-aligned hard against the edge',
    'Energy costs must be DRAWN AS CIRCULAR TYPE SYMBOL ICONS, never spelled out as words',
    'Move rules text sits in smaller type directly beneath its own move name',
    'Bottom strip split into three compartments with symbol icons: weakness, resistance, retreat cost',
    'Footer: illustrator credit and card number on the left, italic flavour text on the right',
    'Keep every row horizontally aligned and give the text room to breathe — no cramped or overlapping type',
  ],
  onepiece: [
    'Cost drawn as a numeral inside a circular bubble in the top-left corner',
    'Attribute icon badge in the top-right corner',
    'Power value in large numerals; counter value runs as a vertical strip down the left edge',
    'The illustration is full-bleed and runs underneath every other element',
    'Effect text sits in a semi-transparent rounded box in the lower third',
    'Keyword labels such as 【登場時】 or 【Trigger】 are drawn as small coloured pill badges inline at the start of the sentence, not as plain text',
    'Stacked at the bottom in this order: card type band, then the card name banner, then a narrow trait band',
    'Footer: card number and illustrator credit',
    'Keep the effect text short and the characters correctly formed — legibility matters more than filling the box',
  ],
};

const LEGIBILITY =
  'All printed Traditional Chinese characters must be correctly formed and fully legible; prefer fewer, shorter lines over cramming text in.';

// --- 新版欄位 → test1 輸入的對照 --------------------------------------------

export const ENERGY_TO_ZH: Record<string, string> = {
  fire: '火', grass: '草', water: '水', lightning: '電', psychic: '超能',
  darkness: '惡', fighting: '格鬥', metal: '鋼', fairy: '妖精', dragon: '龍',
  ice: '冰', ground: '地面', ghost: '幽靈', colorless: '無',
};

export const OPCOLOR_TO_ZH: Record<string, string> = {
  red: '紅', green: '綠', blue: '藍', purple: '紫', black: '黑', yellow: '黃',
};

export const YGOATTR_TO_EN: Record<string, string> = {
  light: 'LIGHT', dark: 'DARK', earth: 'EARTH', water: 'WATER',
  fire: 'FIRE', wind: 'WIND', divine: 'DIVINE',
};

// ---------------------------------------------------------------------------

export function buildClassic(
  systemId: string,
  fields: FieldDef[],
  values: Record<string, string>,
  modes: Record<string, FillMode>
): { jsonLines: JsonLine[]; plain: string } {
  const r = makeResolver(fields, values, modes);
  const j = new JsonWriter();

  /** 取某一格的英文關鍵字；'auto' / 'none' 這種「不指定」的選項回空字串 */
  const kw = (id: string) => {
    const f = fields.find((x) => x.id === id);
    if (!f) return '';
    const v = values[id] ?? f.default;
    if (!v || v === 'auto' || v === 'none') return '';
    return keywordsOf(fields, id, v);
  };

  const name = r('name').value || '貝登堡';
  const pose = r('pose').value;
  const expression = r('expression').value;
  const bgDetails = r('bg_details').value;
  const bgAtmosphere = r('bg_atmosphere').value;
  const bgSetting = r('bg_setting').value;

  // 附圖（人 / 寵物 / 物件）會改寫 subject、hair、clothing，並多一個 reference_image 區塊
  const ref = referenceLines(values);
  const outfit = r('outfit').value;

  j.open(null);
  j.kv(
    'subject',
    `2D anime style character "${name}"${ref.subjectSuffix}`,
    'name',
    r('name').ai
  );

  if (ref.block) {
    j.open('reference_image');
    j.kv('usage', ref.block.usage, 'ref_use');
    j.kv('must_keep', ref.block.must_keep, 'ref_keep');
    j.kv('fidelity', ref.block.fidelity, 'ref_strength');
    j.kvForce('do_not', ref.block.do_not, 'ref_use', false, false);
    j.close();
  }

  // ---- art_style ----
  j.open('art_style');
  j.kv('rendering', RENDERING);
  j.kv(
    'theme',
    systemId === 'pokemon'
      ? 'Official Pokémon TCG high-end illustration aesthetic, dynamic full-bleed action scene, vibrant cel-shaded 90s anime style, intense energy effects'
      : systemId === 'onepiece'
      ? 'Official One Piece Card Game aesthetic, dynamic manga-style impact lines, high-saturation cinematic colors'
      : 'Yu-Gi-Oh! OCG official card art style, intricate fantasy detailing, sharp anime cel-shading'
  );
  // 畫風 / 鏡頭 / 光線 這幾格以前只影響「結構化 JSON」分頁，
  // 現在只有一份輸出，所以一律併進來 —— 每一格都看得到自己的去處。
  j.kv('direction', kw('art_style'), 'art_style');
  j.kv('camera', kw('camera'), 'camera');
  j.kv('lighting', kw('time_light'), 'time_light');
  j.kv('palette', kw('color_mood') || kw('palette'), values.color_mood ? 'color_mood' : 'palette');
  j.kv('linework', kw('line_quality'), 'line_quality');
  j.kv('detail_density', kw('detail_level'), 'detail_level');
  j.kv('summon_fx', kw('summon_fx'), 'summon_fx');
  j.kv('power_fx', kw('haki'), 'haki');
  j.close();

  if (systemId === 'pokemon') {
    // 「有寵物 / 無寵物」兩種版本：由主角類型 + 夥伴欄位決定。
    // 有寵物時完全照 test1 原本的雙人聯動寫法；無寵物時改成單人構圖。
    const soloMode = values.subject_type === 'trainer' || !r('partner').value.trim();
    const partner = r('partner').value || '噴火龍';
    const pType = ENERGY_TO_ZH[values.energy_type] || '火';
    const dynamicBG = TYPE_BG[pType] || '高能量戰鬥場景，背景充滿爆炸光斑與屬性粒子';

    // ---- character_details ----
    j.open('character_details');
    j.kv('pose', pose || 'dynamic battle pose full of power', 'pose', r('pose').ai);
    j.kv('expression', expression || 'confident and energetic expression', 'expression', r('expression').ai);
    j.kv('hair', ref.usePhotoForHair ? REF_PHOTO : '', 'ref_use');
    j.kv('clothing', ref.usePhotoForLooks ? REF_PHOTO : outfit, ref.usePhotoForLooks ? 'ref_use' : 'outfit');
    j.open('main_character');
    j.kv('name', name, 'name', r('name').ai);
    j.kv('pose', pose || '全身肌肉緊繃，右手高舉精靈球準備投擲', 'pose', r('pose').ai);
    j.kv('expression', expression || '自信熱血的表情', 'expression', r('expression').ai);
    j.close();
    if (!soloMode) {
      j.open('partner_pokemon');
      j.kv('name', partner, 'partner', r('partner').ai);
      j.kv('pose', '與主角動作呼應，釋放強大終極技能');
      j.kv('type', pType, 'energy_type');
      j.close();
    }
    j.close();

    // ---- background ----
    j.open('background');
    // test1 原本把 setting 寫死；這裡改成「你有填就用你的」，沒填才回到原本的預設
    j.kvForce(
      'setting',
      bgSetting || (soloMode ? '單人主角英姿場景' : '高強度雙人聯動戰鬥場景'),
      'bg_setting',
      r('bg_setting').ai
    );
    j.kvForce('details', bgDetails || dynamicBG, 'bg_details', r('bg_details').ai);
    j.kvForce('atmosphere', bgAtmosphere || `強烈爆炸與${pType}屬性粒子四射，極具張力`, 'bg_atmosphere', r('bg_atmosphere').ai);
    j.close();

    // ---- card_layout ----
    const m1n = r('attack1_name').value || `${pType}屬性連擊`;
    const m1t =
      r('attack1_text').value ||
      (soloMode ? `釋放${pType}能量發動突擊，造成大量傷害` : `與${partner}聯手釋放${pType}能量，造成大量傷害`);
    const m2n = r('attack2_name').value || `終極${pType}爆發`;
    const m2t =
      r('attack2_text').value ||
      (soloMode ? `傾盡全力引發毀滅性${pType}爆炸` : `召喚${partner}全力攻擊，引發毀滅性${pType}爆炸`);
    const abilityName = r('ability_name').value;
    const abilityText = r('ability_text').value;
    const ability =
      abilityName || abilityText
        ? [abilityName, abilityText].filter(Boolean).join('：')
        : soloMode
        ? '童軍精神：我方全體寶可夢的撤退費用減少 1'
        : `聯手加成：${partner}在場時攻擊力提升`;

    j.open('card_layout');
    j.kv('dimensions', DIMENSIONS);
    j.arr('frame_structure', [...FRAME_STRUCTURE.pokemon, LEGIBILITY].map((t) => ({ text: t })));
    j.arr('ui_elements', [
      { text: `Top: HP • ${pType}屬性符號`, fieldId: 'energy_type' },
      {
        text: soloMode
          ? `Card Name: 「${name}」 單人版`
          : `Card Name: 「${name} & ${partner}」 雙人聯動攻擊版`,
        fieldId: 'name',
      },
      {
        text: `Move 1: "${m1n}" Energy: ${values.attack1_cost || '2' + pType[0]} Damage: ${r('attack1_dmg').value || '120'}`,
        fieldId: 'attack1_name', ai: r('attack1_name').ai,
      },
      { text: `Move 1 Text: ${m1t}`, fieldId: 'attack1_text', ai: r('attack1_text').ai },
      {
        text: `Move 2: "${m2n}" Energy: ${values.attack2_cost || '4' + pType[0]} Damage: ${r('attack2_dmg').value || '220'}`,
        fieldId: 'attack2_name', ai: r('attack2_name').ai,
      },
      { text: `Move 2 Text: ${m2t}`, fieldId: 'attack2_text', ai: r('attack2_text').ai },
      { text: `Ability: ${ability}`, fieldId: 'ability_name', ai: r('ability_name').ai },
      { text: `Card Number: ${values.set_number || 'G F 121/728'}`, fieldId: 'set_number' },
      { text: '所有文字使用繁體中文，招式名帶有強烈戰鬥氣勢' },
    ]);
    j.close();

    // ---- visual_effects ----
    // 工藝直接由「稀有度 / 箔面 / 卡框」三格決定，不再另外開一個重複的工藝下拉。
    const finish = [kw('rarity'), kw('foil'), kw('border')].filter(Boolean).join(', ');
    j.open('visual_effects');
    j.kv('finish', kw('rarity'), 'rarity');
    j.kv('foil', kw('foil'), 'foil');
    j.kv('border', kw('border'), 'border');
    j.kv('lighting', `Dramatic battle lighting with strong ${pType} color contrast`, 'energy_type');
    j.kvForce(
      'texture',
      /rainbow|holo|foil/i.test(finish)
        ? 'Full-bleed holographic with energy particles'
        : 'High-detail dynamic action texture',
      'foil',
      false,
      false
    );
    j.close();
  } else if (systemId === 'onepiece') {
    const opColor = OPCOLOR_TO_ZH[values.color] || '紅';

    j.open('character_details');
    j.kv('pose', pose || 'dynamic battle pose full of power', 'pose', r('pose').ai);
    j.kv('expression', expression || 'confident and energetic expression', 'expression', r('expression').ai);
    j.kv('hair', ref.usePhotoForHair ? REF_PHOTO : '', 'ref_use');
    j.kv('clothing', ref.usePhotoForLooks ? REF_PHOTO : outfit, ref.usePhotoForLooks ? 'ref_use' : 'outfit');
    j.close();

    j.open('background');
    j.kvForce('setting', bgSetting || '激烈戰鬥場景', 'bg_setting', r('bg_setting').ai);
    j.kvForce('details', bgDetails || COLOR_BG[opColor] || '高張力海戰場面', 'bg_details', r('bg_details').ai);
    j.kvForce('atmosphere', bgAtmosphere || `${opColor}色調強烈能量爆發，充滿熱血與破壞力`, 'bg_atmosphere', r('bg_atmosphere').ai);
    j.close();

    const effectText = r('effect_text').value || `登場時，${name}發動強力${opColor}屬性攻擊，所有相關卡牌獲得加成`;

    j.open('card_layout');
    j.kv('dimensions', DIMENSIONS);
    j.arr('frame_structure', [...FRAME_STRUCTURE.onepiece, LEGIBILITY].map((t) => ({ text: t })));
    j.arr('ui_elements', [
      { text: `Cost: ${r('cost').value || '10'}`, fieldId: 'cost', ai: r('cost').ai },
      { text: `Power: ${r('power').value || '12000'}`, fieldId: 'power', ai: r('power').ai },
      { text: `Name: ${name}`, fieldId: 'name' },
      { text: `Subtitle: ${r('tribe').value || '四皇 / 童軍之父'}`, fieldId: 'tribe', ai: r('tribe').ai },
      { text: `Effect: ${effectText}`, fieldId: 'effect_text', ai: r('effect_text').ai },
      { text: `Card Number: ${values.set_number || 'P-041'}`, fieldId: 'set_number' },
    ]);
    j.close();

    j.open('visual_effects');
    j.kv('finish', kw('rarity'), 'rarity');
    j.kv('foil', kw('foil'), 'foil');
    j.kv('lighting', `Dramatic lighting with strong ${opColor} accents`, 'color');
    j.kvForce('texture', '', undefined, false, false);
    j.close();
  } else {
    const ygAttr = YGOATTR_TO_EN[values.attribute] || 'LIGHT';

    j.open('character_details');
    j.kv('pose', pose || 'dynamic battle pose full of power', 'pose', r('pose').ai);
    j.kv('expression', expression || 'confident and energetic expression', 'expression', r('expression').ai);
    j.kv('hair', ref.usePhotoForHair ? REF_PHOTO : '', 'ref_use');
    j.kv('clothing', ref.usePhotoForLooks ? REF_PHOTO : outfit, ref.usePhotoForLooks ? 'ref_use' : 'outfit');
    j.close();

    j.open('background');
    j.kvForce('setting', bgSetting || '史詩級召喚戰鬥場面', 'bg_setting', r('bg_setting').ai);
    j.kvForce('details', bgDetails || ATTR_BG[ygAttr] || '神秘強大戰鬥場景', 'bg_details', r('bg_details').ai);
    j.kvForce('atmosphere', bgAtmosphere || `${ygAttr}屬性強烈能量爆發`, 'bg_atmosphere', r('bg_atmosphere').ai);
    j.close();

    const ygEffect =
      r('effect_text').value || `這張卡在規則上也當作「${name}」卡使用。召喚成功時可加入相關卡片。`;

    j.open('card_layout');
    j.kv('dimensions', DIMENSIONS);
    j.arr('ui_elements', [
      { text: `Card Name: ${name}`, fieldId: 'name' },
      { text: `Attribute: ${ygAttr}`, fieldId: 'attribute' },
      { text: `Level: ${r('level').value || '10'} Stars`, fieldId: 'level', ai: r('level').ai },
      { text: `ATK/DEF: ${r('atk').value || '∞'} / ${r('def').value || '∞'}`, fieldId: 'atk', ai: r('atk').ai },
      { text: `Effect: ${ygEffect}`, fieldId: 'effect_text', ai: r('effect_text').ai },
      { text: `Card Number: ${values.set_code || 'DDX-001'}`, fieldId: 'set_code' },
    ]);
    j.close();

    j.open('visual_effects');
    j.kv('card_frame', kw('frame_type'), 'frame_type');
    j.kv('finish', kw('rarity'), 'rarity');
    j.kv('foil', kw('foil'), 'foil');
    j.kv('lighting', `Mystical lighting with strong ${ygAttr} attribute emphasis`, 'attribute');
    j.kvForce('texture', '', undefined, false, false);
    j.close();
  }

  // ---- 輸出目標與負面提示 ----
  // 只有一份輸出，所以連「要插圖還是整張卡」「不要出現什麼」都寫在同一份 JSON 裡，
  // 使用者整段複製貼上就好，不用再去別的分頁找。
  j.kv('output_target', kw('output_target'), 'output_target');
  j.kvForce(
    'negative_prompt',
    BASE_NEGATIVE + ((values.output_target || 'artwork') === 'artwork' ? ', card frame, borders, any text' : ''),
    'output_target',
    false,
    false
  );

  j.close('}', false); // 收掉最外層
  const lines = j.finish();
  // 補掉 arr() 在區塊尾端留下的逗號
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1];
    if (lines[i].text.trimEnd().endsWith('],') && next && next.text.trim().startsWith('}')) {
      lines[i] = { ...lines[i], text: lines[i].text.replace(/,$/, '') };
    }
  }

  return { jsonLines: lines, plain: lines.map((l) => l.text).join('\n') };
}
