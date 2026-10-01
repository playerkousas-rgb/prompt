// ---------------------------------------------------------------------------
// 組合章（一套幾片，拼起來是一張圖）
//
// 這一套的核心主張，是做完功課之後的結論：
//
//   1. **先定母版外框，再切開** —— 跟使用者想的一樣，而且順序不能反。
//      先畫整張圖再切，拼起來才會連得上；先畫每片再湊，永遠湊不準。
//
//   2. **但「切開」不等於把圖剪開。** 每一片做出來之後都會各自長出自己的邊
//      （包邊 3.5 mm，雷切也有 1 mm），所以兩片之間必定隔著 2–7 mm 的邊。
//      → 切縫要當成設計元素：全套用同一個邊色，當作拼圖的「填縫」。
//      → 臉、字、關鍵圖形絕對不能壓在切線上，會被邊吃掉。
//
//   3. **每一片都必須單獨看得懂。** 交換章九成的時間是單獨出現在別人的章板上，
//      拼完整的樣子一輩子只會出現在合照裡。
//
//   4. **生圖要分兩段。** AI 一次生不出 N 張能對齊的圖。
//      所以這裡輸出的主提示詞是「整張母圖」，附件才是逐片的提示詞
//      （每片都叫 AI 以母圖為參考圖，只重畫那一塊 + 補自己的邊）。
// ---------------------------------------------------------------------------

import { JsonWriter, PromptWriter, keywordsOf, makeResolver } from '../../schema/builder';
import type { CardSystem, ExtraOutput, FieldDef, FillMode, ZoneDef } from '../../schema/types';
import { SET_GROUPS } from '../groups';
import { BADGE_SHAPES, shapeById, fitBox, SPLITS, splitById } from '../shapes';
import { CRAFTS, EDGES, craftById } from '../craft';
import { ART_STYLES, PALETTES } from './patch';

const VB = { w: 640, h: 640 };

const zones: ZoneDef[] = [
  {
    id: 'master', label: '母版（拼起來的樣子）',
    fieldIds: ['set_theme', 'master_shape', 'master_art', 'master_text'],
    x: 14, y: 14, w: 612, h: 612, tone: 'soft',
  },
  { id: 'cut', label: '切法與片數', fieldIds: ['split', 'piece_count'], x: 150, y: 250, w: 340, h: 120 },
  { id: 'pieces', label: '每片各自的主角', fieldIds: ['piece_subjects', 'piece_text'], x: 40, y: 430, w: 320, h: 110 },
  { id: 'seam', label: '切縫 / 共用邊色', fieldIds: ['seam_color', 'edge'], x: 384, y: 430, w: 220, h: 110 },
  { id: 'style', label: '全套共用的風格與配色', fieldIds: ['art_style', 'palette', 'color_count'], x: 40, y: 56, w: 300, h: 92 },
  { id: 'craft', label: '工藝與尺寸', fieldIds: ['craft', 'size_each'], x: 384, y: 56, w: 220, h: 92 },
];

const fields: FieldDef[] = [
  // --- 母版 ---------------------------------------------------------------
  {
    id: 'set_theme', label: '這一套在紀念什麼', group: 'master', impact: 'high',
    hint: '一句話。整套的靈魂，每一片都要回到它。',
    control: { kind: 'text', placeholder: '例如：2026 聯團大露營 · 四個營區' },
    aiFillable: false, default: '2026 聯團大露營', essential: true,
  },
  {
    id: 'master_shape', label: '母版外框', group: 'master', impact: 'high',
    hint: '拼起來之後的整體外形。先決定這個，刀才知道往哪落。',
    control: { kind: 'chips', options: BADGE_SHAPES.map((s) => ({
      value: s.value, label: s.label, desc: s.desc, swatch: s.merrowable ? '#4ade80' : '#f59e0b',
    })) },
    aiFillable: false, default: 'circle', essential: true,
  },
  {
    id: 'master_art', label: '母圖畫什麼', group: 'master', impact: 'high',
    hint: '整張拼起來的畫面。寫成一句景，不要寫成條列。',
    control: { kind: 'textarea', rows: 2, placeholder: '例如：一片連綿山稜，中間一柱營火，天空有銀河' },
    aiFillable: true, aiInstruction: 'invent one coherent scene that survives being cut apart',
    default: '一片連綿山稜，中央一柱營火，天空橫過一條銀河', essential: true,
  },
  {
    id: 'master_text', label: '橫跨全套的文字', group: 'master', impact: 'mid',
    hint: '拼起來才讀得完的字（例如一片一個字）。留空就不放。',
    control: { kind: 'text', placeholder: '例如：2026 聯團大露營' },
    aiFillable: false, default: '2026 聯團大露營',
  },

  // --- 切法 ---------------------------------------------------------------
  {
    id: 'split', label: '怎麼切', group: 'split', impact: 'high',
    hint: '切法決定做得出來與否，也決定每片還能不能單獨看。',
    control: { kind: 'chips', options: SPLITS.map((s) => ({
      value: s.value, label: s.label, desc: s.desc,
      swatch: s.piecesRegular ? '#4ade80' : '#f59e0b',
    })) },
    aiFillable: false, default: 'ring', essential: true,
  },
  {
    id: 'piece_count', label: '幾片', group: 'split', impact: 'high',
    hint: '每多一片就多一次打樣費與一份 MOQ。4 片是甜蜜點。',
    control: { kind: 'select', options: [2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} 片` })) },
    aiFillable: false, default: '4', essential: true,
  },
  {
    id: 'seam_color', label: '切縫（共用邊色）', group: 'split', impact: 'mid',
    hint: '這是組合章最關鍵的一格：兩片之間一定會有邊，全套同色才會像「填縫」而不是斷裂。',
    control: { kind: 'text', placeholder: '例如：奶油白；或 深棕' },
    aiFillable: false, default: '奶油白', essential: true,
  },

  {
    id: 'tab_shape', label: '榫頭形狀', group: 'split', impact: 'mid',
    hint: '只有咬合拼圖要管。圓榫最好脫模、燕尾榫咬得最牢、方榫最容易做歪。',
    control: { kind: 'select', options: [
      { value: 'round', label: '圓榫（最好做）', keywords: 'rounded knob-and-socket interlock, the classic jigsaw tab' },
      { value: 'dovetail', label: '燕尾榫（咬最牢）', keywords: 'dovetail interlock that widens towards its tip so the pieces cannot pull apart sideways' },
      { value: 'square', label: '方榫（最俐落）', keywords: 'square tongue-and-groove interlock with sharp corners' },
    ] },
    showIf: (v) => (v.split || '') === 'jigsaw',
    aiFillable: false, default: 'round',
  },
  {
    id: 'tab_mm', label: '榫頭寬度（mm）', group: 'split', impact: 'mid',
    hint: '低於 8 mm 的榫頭在布章上會散、在軟膠上會斷。',
    control: { kind: 'select', options: ['8', '10', '12', '15'].map((x) => ({ value: x, label: `${x} mm` })) },
    showIf: (v) => (v.split || '') === 'jigsaw',
    aiFillable: false, default: '10',
  },
  {
    id: 'fit', label: '配合鬆緊（公差）', group: 'split', impact: 'mid',
    hint: '布章會縮、軟膠會脹。緊配拼起來最漂亮，但做壞了就塞不進去。',
    control: { kind: 'select', options: [
      { value: 'tight', label: '緊配（±0.3 mm，拿得起來）', keywords: 'tight interference fit, the assembled set can be lifted as one piece' },
      { value: 'normal', label: '標準（±0.8 mm，平放剛好）', keywords: 'normal clearance fit, the pieces sit together when laid flat' },
      { value: 'loose', label: '鬆配（±1.5 mm，好拆好收）', keywords: 'loose fit with a visible gap, easy to separate' },
    ] },
    showIf: (v) => (v.split || '') === 'jigsaw',
    aiFillable: false, default: 'normal',
  },

  // --- 每片 ---------------------------------------------------------------
  {
    id: 'piece_subjects', label: '每片的主角（一行一片）', group: 'pieces', impact: 'high',
    hint: '每一行對應一片。單獨拿出來也要看得懂，這才是交換章真正被看見的樣子。',
    control: {
      kind: 'textarea', rows: 5,
      placeholder: '營火\n溪流與獨木舟\n山頂日出\n夜間觀星',
    },
    aiFillable: true, aiInstruction: 'invent one distinct sub-theme per piece, all within the master scene',
    default: '營火\n溪流與獨木舟\n山頂日出\n夜間觀星', essential: true,
  },
  {
    id: 'piece_text', label: '每片要不要各自有字', group: 'pieces', impact: 'mid',
    hint: '片數越多、每片越小，字就越容易糊。建議只放一個詞或一個數字。',
    control: { kind: 'select', options: [
      { value: 'none', label: '不放字（最安全）', keywords: '' },
      { value: 'number', label: '只放片號（1/4、2/4…）', keywords: 'a small piece number such as 1/4 in the lower corner' },
      { value: 'word', label: '一個詞（營區名）', keywords: 'one short word naming this piece, bold and large' },
      { value: 'share', label: '分攤整句（一片一段）', keywords: 'this piece carries only its share of the set-wide lettering' },
    ] },
    aiFillable: false, default: 'word',
  },

  // --- 風格 ---------------------------------------------------------------
  {
    id: 'art_style', label: '美術風格（全套共用）', group: 'style', impact: 'high',
    hint: '整套一定要同一個風格，否則拼起來像四個不同的人畫的。',
    control: { kind: 'chips', options: ART_STYLES },
    aiFillable: false, default: 'retro_patch', essential: true,
  },
  {
    id: 'palette', label: '配色（全套共用）', group: 'style', impact: 'high',
    hint: '組合章的配色不能各片各調。先定一組，所有片都只能用這組。',
    control: { kind: 'chips', options: PALETTES },
    aiFillable: false, default: 'scout_classic', essential: true,
  },
  {
    id: 'color_count', label: '色數上限', group: 'style', impact: 'mid',
    hint: '整套共用同一組線色，工廠才不會每片換線（也比較便宜）。',
    control: { kind: 'select', options: ['4', '5', '6', '8'].map((n) => ({ value: n, label: `${n} 色` })) },
    aiFillable: false, default: '5',
  },

  // --- 工藝 ---------------------------------------------------------------
  {
    id: 'craft', label: '工藝', group: 'craft', impact: 'mid',
    hint: '咬合拼圖只建議 PVC 或織章；電繡的榫頭會散。',
    control: { kind: 'select', options: CRAFTS.map((c) => ({ value: c.value, label: c.label, desc: c.desc, keywords: c.keywords })) },
    aiFillable: false, default: 'embroidery', essential: true,
  },
  {
    id: 'edge', label: '邊緣處理', group: 'craft', impact: 'mid',
    hint: '包邊 3.5 mm：兩片相鄰就是 7 mm 的縫。要縫細一點就選雷切。',
    control: { kind: 'select', options: EDGES },
    aiFillable: false, default: 'laser',
  },
  {
    id: 'size_each', label: '每片尺寸（mm）', group: 'craft', impact: 'mid',
    hint: '這是「單片」的尺寸，不是拼起來的尺寸。下面會自動換算整套多大。',
    control: { kind: 'select', options: ['40', '50', '60', '75', '90'].map((n) => ({ value: n, label: `${n} mm` })) },
    aiFillable: false, default: '50', essential: true,
  },
];

// --- 每片怎麼從母圖切出來 ---------------------------------------------------

function cropOf(splitId: string, i: number, total: number): string {
  switch (splitId) {
    case 'pie': {
      const from = Math.round((360 / total) * i);
      const to = Math.round((360 / total) * (i + 1));
      return `the wedge of the master artwork from ${from}° to ${to}° (clockwise from twelve o'clock)`;
    }
    case 'grid': {
      const cols = total === 4 ? 2 : 3;
      const r = Math.floor(i / cols) + 1;
      const c = (i % cols) + 1;
      return `the tile in row ${r}, column ${c} of the master artwork`;
    }
    case 'stripe':
      return `horizontal band ${i + 1} of ${total}, counted from the top of the master artwork`;
    case 'ring':
      return i === 0
        ? 'the central medallion of the set — the hero piece'
        : `satellite piece ${i} of ${total - 1}, a self-contained small badge that echoes the centre piece`;
    case 'series':
      return `variant ${i + 1} of ${total} in the series — the frame and layout are identical to the others, only the hero subject changes`;
    case 'jigsaw':
      return `interlocking piece ${i + 1} of ${total}, counted left to right${
        i < total - 1 ? ', with a rounded tab protruding from its right edge' : ''
      }${i > 0 ? ', and a matching notch cut into its left edge' : ''}`;
    default:
      return `piece ${i + 1} of ${total}`;
  }
}

function subjectsOf(values: Record<string, string>, count: number): string[] {
  const raw = (values.piece_subjects || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return Array.from({ length: count }, (_, i) => raw[i] ?? `（第 ${i + 1} 片還沒想好）`);
}

/** 做得出來嗎：組合章特有的檢查 */
function setNotes(values: Record<string, string>) {
  const split = splitById(values.split || 'ring');
  const count = Number(values.piece_count || '4');
  const craft = craftById(values.craft || 'embroidery');
  const shape = shapeById(values.master_shape || 'circle');
  const size = Number(values.size_each || '50');
  const edge = values.edge || 'laser';
  const out: { zh: string; en: string; fieldId?: string }[] = [];

  if (!split.counts.includes(count)) {
    out.push({
      fieldId: 'piece_count',
      zh: `「${split.label}」建議的片數是 ${split.counts.join(' / ')} 片，${count} 片會切得不平均。`,
      en: '',
    });
  }

  out.push({ fieldId: 'split', zh: split.note, en: '' });

  const seam = edge === 'merrow' ? 3.5 : 1;
  out.push({
    fieldId: 'seam_color',
    zh: `每片各自有 ${seam} mm 的邊，所以兩片相鄰時中間會出現 ${seam * 2} mm 的縫。全套邊色請統一（目前：${
      values.seam_color || '未填'
    }），並且不要讓臉、字、關鍵圖形壓在切線上。`,
    en: `Every piece carries its own ${seam}mm edge, so adjacent pieces are separated by a ${
      seam * 2
    }mm seam in the border colour. Treat that seam as grout: keep faces, lettering and key shapes clear of the cut lines.`,
  });

  if (split.value === 'jigsaw') {
    const tab = Number(values.tab_mm || '10');
    const fitTol = values.fit === 'tight' ? 0.3 : values.fit === 'loose' ? 1.5 : 0.8;
    out.push({
      fieldId: 'tab_mm',
      zh: `榫頭 ${tab} mm、配合公差 ±${fitTol} mm。請工廠確認：刀模（或雷切路徑）是否照同一個檔案出，公母件是否分開開模，以及${
        craft.isEmbroidery ? '布料回縮' : '軟膠收縮'
      }會不會吃掉公差。`,
      en: `The interlocking tabs are about ${tab}mm wide — draw them chunky and rounded, never as thin puzzle knobs.`,
    });
  }

  if (split.value === 'jigsaw' && craft.isEmbroidery) {
    out.push({
      fieldId: 'craft',
      zh: `目前選了${craft.label}：咬合榫頭用電繡會散開，織章勉強可以，最穩的是 PVC 軟膠。建議換工藝或改用棋盤格切法。`,
      en: 'Interlocking tabs must be chunky (8mm or more) — no thin puzzle knobs.',
    });
  }

  if (edge === 'merrow' && !split.piecesRegular) {
    out.push({
      fieldId: 'edge',
      zh: `「${split.label}」切出來的片不是規則外形，包不了邊，請改雷切。`,
      en: '',
    });
  }

  if (edge === 'merrow' && !shape.merrowable) {
    out.push({ fieldId: 'master_shape', zh: `母版「${shape.label}」本身就不能包邊。`, en: '' });
  }

  if (split.value === 'series') {
    out.push({
      fieldId: 'split',
      zh: '系列式套章不需要對齊，但版型必須完全一致：外框、字級、留白、邊色都要共用同一份模板，請工廠用同一個版去改主圖。',
      en: '',
    });
  }

  if (size <= 40) {
    out.push({
      fieldId: 'size_each',
      zh: `每片只有 ${size} mm，扣掉邊之後畫面其實只剩 ${size - (edge === 'merrow' ? 7 : 2)} mm，別放文字。`,
      en: '',
    });
  }

  out.push({
    fieldId: 'piece_count',
    zh: `${count} 片 = ${count} 次打樣費 + ${count} 份最低訂量（一般每款 100 片）。報價時請工廠分開列。`,
    en: '',
  });

  return out;
}

// --- 輸出 -------------------------------------------------------------------

function build(values: Record<string, string>, modes: Record<string, FillMode>) {
  const r = makeResolver(fields, values, modes);
  const kw = (id: string) => {
    const v = values[id] ?? '';
    if (!v || v === 'none') return '';
    return keywordsOf(fields, id, v);
  };

  const shape = shapeById(values.master_shape || 'circle');
  const split = splitById(values.split || 'ring');
  const count = Number(values.piece_count || '4');
  const craft = craftById(values.craft || 'embroidery');
  const size = Number(values.size_each || '50');
  const seam = (values.seam_color || '').trim();
  const subjects = subjectsOf(values, count);
  const notes = setNotes(values);
  const master = r('master_art');

  const p = new PromptWriter();
  p.lit('A set of ');
  p.field('piece_count', String(count));
  p.lit(' scout patches that assemble into one artwork. ');
  p.field('master_art', master.value, master.ai);

  // --- 主輸出：母圖 ---------------------------------------------------------
  const j = new JsonWriter();
  j.open(null);
  j.kv('subject', `Scout commemorative patch SET — ${values.set_theme || ''}, the complete assembled artwork`, 'set_theme');
  j.kvForce(
    'stage',
    split.value === 'series'
      ? 'STEP 1 of 2 — render the shared template: all the variants side by side in one image, so the common frame and layout are locked in. Each badge is produced separately afterwards.'
      : 'STEP 1 of 2 — render the complete assembled artwork as ONE image. The individual pieces are generated afterwards from this master.',
    'split'
  );

  j.open('set');
  j.kvForce('pieces', `${count} separate patches`, 'piece_count');
  j.kvForce('division', split.assembled, 'split');
  j.kvForce(
    'cut_lines',
    `Draw the cut lines as thin seams in the shared border colour${seam ? ` (${seam})` : ''}, like grout between tiles — each finished piece will carry its own ${
      (values.edge || 'laser') === 'merrow' ? '3.5mm merrowed' : '1mm laser-cut'
    } edge.`,
    'seam_color'
  );
  if (split.value === 'jigsaw') {
    j.kvForce(
      'interlock',
      `${kw('tab_shape')}, tabs about ${values.tab_mm || '10'}mm wide, ${kw('fit')}`,
      'tab_shape'
    );
  }
  j.kvForce(
    'composition_rule',
    'Keep faces, lettering and key shapes well clear of the cut lines, and make every single piece readable on its own.',
    'piece_subjects',
    false,
    false
  );
  j.close();

  j.open('artwork');
  j.kv('master_scene', master.value, 'master_art', master.ai);
  j.kvForce('silhouette', `${shape.keywords}, the assembled set measures about ${assembledSize(split.value, count, size)} across`, 'master_shape');
  j.arr(
    'piece_subjects',
    subjects.map((s, i) => ({ text: `${cropOf(split.value, i, count)}: ${s}`, fieldId: 'piece_subjects' }))
  );
  j.close();

  j.open('typography');
  if ((values.master_text || '').trim()) {
    j.kv('set_wide_text', values.master_text, 'master_text');
  }
  j.kv('per_piece_text', kw('piece_text'), 'piece_text');
  j.kvForce(
    'rules',
    `Spell every character exactly as given; Traditional Chinese characters must be correctly formed. Smallest readable lettering for ${craft.enLabel} is ${craft.minTextMm}mm, and each piece is only ${size}mm across.`,
    'piece_text',
    false,
    false
  );
  j.close();

  j.open('style');
  j.kv('art_direction', kw('art_style'), 'art_style');
  j.kv('palette', kw('palette'), 'palette');
  j.kvForce('colour_count', `${values.color_count || '5'} flat colours maximum, shared by every piece in the set`, 'color_count', false, false);
  j.close();

  j.open('craft');
  j.kv('method', kw('craft'), 'craft');
  j.kv('edge', kw('edge'), 'edge');
  j.kvForce('size', `${size} mm per piece`, 'size_each', false, false);
  j.close();

  const en = notes.filter((n) => n.en);
  if (en.length) j.arr('manufacturing_notes', en.map((n) => ({ text: n.en, fieldId: n.fieldId })));

  j.kvForce(
    'render',
    `Flat straight-on view of the complete assembled set on a pure white background, every piece in place, soft even light, visible ${craft.textureWord} texture, no mockup shadows, no hands, no uniform`,
    'craft'
  );
  j.kvForce('negative_prompt', NEGATIVE, undefined, false, false);
  j.close('}', false);

  const lines = j.finish();

  return {
    segments: p.segments,
    jsonLines: lines,
    plain: lines.map((l) => l.text).join('\n'),
    negative: NEGATIVE,
    extras: [piecePrompts(values, subjects, count), specSheet(values, subjects, count, notes)],
  };
}

function assembledSize(splitId: string, count: number, each: number) {
  if (splitId === 'stripe') return `${each} × ${each * count} mm`;
  if (splitId === 'grid') {
    const cols = count === 4 ? 2 : 3;
    return `${each * cols} × ${each * Math.ceil(count / cols)} mm`;
  }
  if (splitId === 'series') return `${each} mm × ${count} 款（不拼合）`;
  if (splitId === 'pie') return `${each * 2} mm`;
  if (splitId === 'ring') return `${each * 3} mm（展示板尺寸）`;
  return `${each * count} × ${each} mm`;
}

/** 附件一：第二階段 —— 每一片各自的提示詞 */
function piecePrompts(values: Record<string, string>, subjects: string[], count: number): ExtraOutput {
  const split = splitById(values.split || 'ring');
  const seam = (values.seam_color || '').trim();
  const edge = (values.edge || 'laser') === 'merrow' ? 'a 3.5mm merrowed border' : 'a 1mm laser-cut edge';

  const head = [
    '【第二階段：逐片出圖】',
    '先用上面的主提示詞生出一張「母圖」，滿意之後把那張母圖當參考圖，',
    '再依序丟下面每一段，一次生一片。每一段都已經寫好「只畫哪一塊」。',
    '',
  ].join('\n');

  const body = subjects
    .map((s, i) =>
      [
        `── 第 ${i + 1} 片 / 共 ${count} 片 ──`,
        'Using the attached master artwork as the reference, render ONE finished patch:',
        `· crop: ${cropOf(split.value, i, count)}`,
        `· subject of this piece: ${s}`,
        `· finish this piece with its own closed outline and ${edge}${seam ? ` in ${seam}` : ''}`,
        '· keep exactly the same palette, line weight and art style as the master',
        '· this piece must read as a complete badge on its own',
        '· flat straight-on product shot on pure white, no shadows, no mockup',
        '',
      ].join('\n')
    )
    .join('\n');

  return {
    id: 'pieces',
    label: `逐片提示詞（${count} 段）`,
    desc: '給 AI 的第二階段：先生母圖，再用母圖當參考圖一片一片生',
    text: head + body,
  };
}

/** 附件二：給工廠的組合章規格單 */
function specSheet(
  values: Record<string, string>,
  subjects: string[],
  count: number,
  notes: { zh: string }[]
): ExtraOutput {
  const split = splitById(values.split || 'ring');
  const shape = shapeById(values.master_shape || 'circle');
  const craft = craftById(values.craft || 'embroidery');
  const edge = EDGES.find((e) => e.value === (values.edge || 'laser'))?.label ?? '雷切';
  const size = Number(values.size_each || '50');

  const rows: [string, string][] = [
    ['品名', `${values.set_theme || ''} 組合章（一套 ${count} 片）`],
    ['母版外形', shape.label],
    ['切法', `${split.label}（${count} 片）`],
    ['單片尺寸', `${size} mm`],
    ['拼合後尺寸', assembledSize(split.value, count, size)],
    ['工藝', craft.label],
    ['邊緣處理', `${edge} —— 全套邊色統一為「${values.seam_color || '（未指定）'}」`],
    ['色數', `${values.color_count || '5'} 色，全套共用同一組色`],
    ['每片主題', subjects.map((s, i) => `${i + 1}. ${s}`).join('　')],
    ['整套文字', (values.master_text || '').trim() || '（無）'],
  ];

  return {
    id: 'spec',
    label: '給工廠的規格單（組合章版）',
    desc: '含拼合尺寸、共用邊色、每片打樣與 MOQ 的提醒',
    text: [
      '童軍組合章 製作規格單',
      '——————————————————————',
      ...rows.map(([k, v]) => `${k}：${v}`),
      '',
      '【要注意的地方】',
      ...notes.map((n, i) => `${i + 1}. ${n.zh}`),
      '',
      '【報價請一併回覆】',
      '1. 每一款的打樣費與打樣時間（組合章是 ' + count + ' 款，不是 1 款）',
      '2. 每款的最低訂量，以及整套一起下單有沒有優惠',
      '3. 拼合公差：相鄰兩片的邊能不能對齊，誤差多少 mm',
      '4. 全套邊色是否能保證同一批線 / 同一色號',
      '5. 有沒有整套的紙卡 / 收藏卡包裝',
    ].join('\n'),
  };
}

const NEGATIVE =
  'pieces that do not line up, inconsistent art style between pieces, different palettes, misspelled text, gibberish letters, wrong Chinese characters, blurry, lowres, drop shadow, 3D mockup perspective, photo of a person, cluttered background, watermark, signature';

export const setSystem: CardSystem = {
  id: 'set',
  label: '組合章',
  sublabel: '一套幾片，拼起來是一張圖',
  accent: '#f59e0b',
  ratio: '母版方形畫布 · 單片 40–90 mm',
  groups: SET_GROUPS,
  viewBox: VB,
  anatomyLabel: '母版與切法對照圖',
  zones,
  fields,
  build,
  outline: (values) => {
    const sh = shapeById(values.master_shape || 'circle');
    const sp = splitById(values.split || 'ring');
    const count = Number(values.piece_count || '4');
    const box = fitBox({ x: 26, y: 26, w: VB.w - 52, h: VB.h - 52 }, sh.ratio);
    return {
      d: sh.path(box),
      splits: sp.lines(box, count),
      pieces: sp.pieces(box, count),
      fieldId: 'master_shape',
      note: `母版：${sh.label} · 切法：${sp.label}（${count} 片）—— ${sp.note}`,
    };
  },
};
