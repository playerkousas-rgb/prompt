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

import { JsonWriter, makeResolver } from './builder';
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

const REF_PHOTO = 'Please refer to the first image I uploaded.';

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

/** test1 原本的工藝選項，原字串保留 */
export const CLASSIC_FINISH: Record<string, string[]> = {
  pokemon: [
    'Full Art Rainbow Holographic Foil',
    'SAR Special Art Rare',
    'HR Rainbow Rare',
    'UR Gold Metal Rare',
    'Shiny Treasure Rare',
  ],
  onepiece: [
    'Alt Art Parallel Rare',
    'Manga Rare',
    'SEC Secret Rare',
    'Treasure Rare',
    'SP Anniversary Card',
    'Flagship Event Rare',
    'Full Art Dynamic Foil',
    'Special Illustration Rare (Gold Etched)',
    'Silver Prismatic Parallel',
    'Manga Rare (Red Variant)',
  ],
  yugioh: [
    'Starlight Rare',
    'Ultimate Rare',
    'Ghost Rare',
    'QCSE 25th Anniversary Crushed Diamond',
    'Prismatic Secret Rare',
    '20th Anniversary Red Letter Rare',
    'Collector Rare',
    'God Rare',
    'Hieroglyphic Prismatic Rare',
  ],
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

  const name = r('name').value || '貝登堡';
  const pose = r('pose').value;
  const expression = r('expression').value;
  const bgDetails = r('bg_details').value;
  const bgAtmosphere = r('bg_atmosphere').value;

  j.open(null);
  j.kv('subject', `2D anime style character "${name}" based on reference photo`, 'name', r('name').ai);

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
  j.close();

  if (systemId === 'pokemon') {
    const partner = r('partner').value || '噴火龍';
    const pType = ENERGY_TO_ZH[values.energy_type] || '火';
    const dynamicBG = TYPE_BG[pType] || '高能量戰鬥場景，背景充滿爆炸光斑與屬性粒子';

    // ---- character_details ----
    j.open('character_details');
    j.kv('pose', pose || 'dynamic battle pose full of power', 'pose', r('pose').ai);
    j.kv('expression', expression || 'confident and energetic expression', 'expression', r('expression').ai);
    j.kv('hair', REF_PHOTO);
    j.kv('clothing', REF_PHOTO);
    j.open('main_character');
    j.kv('name', name, 'name', r('name').ai);
    j.kv('pose', pose || '全身肌肉緊繃，右手高舉精靈球準備投擲', 'pose', r('pose').ai);
    j.kv('expression', expression || '自信熱血的表情', 'expression', r('expression').ai);
    j.close();
    j.open('partner_pokemon');
    j.kv('name', partner, 'partner', r('partner').ai);
    j.kv('pose', '與主角動作呼應，釋放強大終極技能');
    j.kv('type', pType, 'energy_type');
    j.close();
    j.close();

    // ---- background ----
    j.open('background');
    j.kv('setting', '高強度雙人聯動戰鬥場景');
    j.kvForce('details', bgDetails || dynamicBG, 'bg_details', r('bg_details').ai);
    j.kvForce('atmosphere', bgAtmosphere || `強烈爆炸與${pType}屬性粒子四射，極具張力`, 'bg_atmosphere', r('bg_atmosphere').ai);
    j.close();

    // ---- card_layout ----
    const m1n = r('attack1_name').value || `${pType}屬性連擊`;
    const m1t = r('attack1_text').value || `與${partner}聯手釋放${pType}能量，造成大量傷害`;
    const m2n = r('attack2_name').value || `終極${pType}爆發`;
    const m2t = r('attack2_text').value || `召喚${partner}全力攻擊，引發毀滅性${pType}爆炸`;
    const abilityName = r('ability_name').value;
    const abilityText = r('ability_text').value;
    const ability =
      abilityName || abilityText
        ? [abilityName, abilityText].filter(Boolean).join('：')
        : `聯手加成：${partner}在場時攻擊力提升`;

    j.open('card_layout');
    j.kv('dimensions', DIMENSIONS);
    j.arr('ui_elements', [
      { text: `Top: HP • ${pType}屬性符號`, fieldId: 'energy_type' },
      { text: `Card Name: 「${name} & ${partner}」 雙人聯動攻擊版`, fieldId: 'name' },
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
    const finish = values.classic_finish || CLASSIC_FINISH.pokemon[0];
    j.open('visual_effects');
    j.kv('finish', finish, 'classic_finish');
    j.kv('lighting', `Dramatic battle lighting with strong ${pType} color contrast`, 'energy_type');
    j.kvForce(
      'texture',
      finish.includes('Rainbow')
        ? 'Full-bleed holographic with energy particles'
        : 'High-detail dynamic action texture',
      'classic_finish',
      false,
      false
    );
    j.close();
  } else if (systemId === 'onepiece') {
    const opColor = OPCOLOR_TO_ZH[values.color] || '紅';

    j.open('character_details');
    j.kv('pose', pose || 'dynamic battle pose full of power', 'pose', r('pose').ai);
    j.kv('expression', expression || 'confident and energetic expression', 'expression', r('expression').ai);
    j.kv('hair', REF_PHOTO);
    j.kv('clothing', REF_PHOTO);
    j.close();

    j.open('background');
    j.kv('setting', '激烈戰鬥場景');
    j.kvForce('details', bgDetails || COLOR_BG[opColor] || '高張力海戰場面', 'bg_details', r('bg_details').ai);
    j.kvForce('atmosphere', bgAtmosphere || `${opColor}色調強烈能量爆發，充滿熱血與破壞力`, 'bg_atmosphere', r('bg_atmosphere').ai);
    j.close();

    const effectText = r('effect_text').value || `登場時，${name}發動強力${opColor}屬性攻擊，所有相關卡牌獲得加成`;

    j.open('card_layout');
    j.kv('dimensions', DIMENSIONS);
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
    j.kv('finish', values.classic_finish || CLASSIC_FINISH.onepiece[0], 'classic_finish');
    j.kv('lighting', `Dramatic lighting with strong ${opColor} accents`, 'color');
    j.kvForce('texture', '', undefined, false, false);
    j.close();
  } else {
    const ygAttr = YGOATTR_TO_EN[values.attribute] || 'LIGHT';

    j.open('character_details');
    j.kv('pose', pose || 'dynamic battle pose full of power', 'pose', r('pose').ai);
    j.kv('expression', expression || 'confident and energetic expression', 'expression', r('expression').ai);
    j.kv('hair', REF_PHOTO);
    j.kv('clothing', REF_PHOTO);
    j.close();

    j.open('background');
    j.kv('setting', '史詩級召喚戰鬥場面');
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
    j.kv('finish', values.classic_finish || CLASSIC_FINISH.yugioh[0], 'classic_finish');
    j.kv('lighting', `Mystical lighting with strong ${ygAttr} attribute emphasis`, 'attribute');
    j.kvForce('texture', '', undefined, false, false);
    j.close();
  }

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

/** 給「經典格式」用的工藝欄位 —— 選項為 test1 原字串 */
export function classicFinishField(systemId: string): FieldDef {
  const opts = CLASSIC_FINISH[systemId] ?? CLASSIC_FINISH.pokemon;
  return {
    id: 'classic_finish',
    label: '經典格式工藝',
    group: 'finish',
    impact: 'mid',
    hint: '只影響「經典 JSON (test1)」分頁的 visual_effects.finish，選項沿用 test1 原本的字串。',
    control: { kind: 'select', options: opts.map((o) => ({ value: o, label: o })) },
    aiFillable: false,
    default: opts[0],
  };
}
