// ---------------------------------------------------------------------------
// 共用型別：整個 Studio 的「單一真相來源」
// 一個欄位 (FieldDef) 同時知道三件事：
//   1. 它在卡面上的哪個位置 (zone)
//   2. 它會變成 prompt 裡的哪一段 (buildPrompt 產生的 segment.fieldId)
//   3. 它對成品的影響力有多大 (impact)
// 這三件事串起來，就是「讓用戶知道改哪裡影響什麼」的基礎。
// ---------------------------------------------------------------------------

export type Impact = 'high' | 'mid' | 'low';

/** 欄位填充模式：用戶鎖死內容，或留給生圖 AI 自由發揮 */
export type FillMode = 'locked' | 'ai';

export type GroupId = 'subject' | 'scene' | 'style' | 'cardface' | 'finish';

export interface GroupDef {
  id: GroupId;
  label: string;
  desc: string;
}

export const GROUPS: GroupDef[] = [
  { id: 'subject', label: '主角', desc: '這張卡在畫誰、在做什麼' },
  { id: 'scene', label: '場景', desc: '他身處什麼環境、什麼氛圍' },
  { id: 'style', label: '畫風', desc: '用什麼美術語言去畫，影響最大的一組' },
  { id: 'cardface', label: '卡面資訊', desc: '印在卡上的文字與數值' },
  { id: 'finish', label: '印刷工藝', desc: '稀有度、燙金、箔面等實體質感' },
];

/** 卡面示意圖上的一塊區域（座標以 630 x 880 的 viewBox 為準，比例同實體卡 63×88mm） */
export interface ZoneDef {
  id: string;
  /** 對應的欄位 id，滑過欄位時這塊會亮起來 */
  fieldIds: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** 插圖窗之類的大區塊用 soft，讓它不要搶視覺 */
  tone?: 'soft' | 'normal';
}

export type ControlDef =
  | { kind: 'text'; placeholder?: string }
  | { kind: 'textarea'; rows?: number; placeholder?: string }
  | { kind: 'number'; min?: number; max?: number; step?: number }
  | { kind: 'select'; options: OptionDef[] }
  /** 圖卡式選項：帶色票與一句說明，讓用戶用看的就懂 */
  | { kind: 'chips'; options: OptionDef[] };

export interface OptionDef {
  value: string;
  label: string;
  /** 選了會怎樣 —— 直接告訴用戶差別 */
  desc?: string;
  /** 色票，給 chips 用 */
  swatch?: string;
  /** 這個選項會注入 prompt 的關鍵字 */
  keywords?: string;
}

export interface FieldDef {
  id: string;
  label: string;
  group: GroupId;
  impact: Impact;
  /** 一句話說明「改這格會影響什麼」 */
  hint: string;
  control: ControlDef;
  /** 能不能交給生圖 AI 代填 */
  aiFillable: boolean;
  /** 交給 AI 時，寫進 prompt 的指示 */
  aiInstruction?: string;
  default: string;
}

/** prompt 被切成一段一段，每段記得自己是哪個欄位生出來的 */
export interface PromptSegment {
  text: string;
  fieldId?: string;
  /** true = 這段是 AI 代填的指示，不是用戶填的實值 */
  ai?: boolean;
}

export interface JsonLine {
  text: string;
  fieldId?: string;
  ai?: boolean;
}

export interface BuildResult {
  /** 自然語言 / Midjourney 用的分段 prompt */
  segments: PromptSegment[];
  /** 結構化 JSON，逐行標記來源欄位 */
  jsonLines: JsonLine[];
  /** 給生圖 API 的純文字 */
  plain: string;
  /** 負面提示詞 */
  negative: string;
}

export interface CardSystem {
  id: string;
  label: string;
  sublabel: string;
  accent: string;
  /** 卡面長寬比說明 */
  ratio: string;
  /** 預設的卡面底圖（AVIF，用來對照版面位置，不是成品預覽） */
  baseImage?: string;
  zones: ZoneDef[];
  fields: FieldDef[];
  build: (values: Record<string, string>, modes: Record<string, FillMode>) => BuildResult;
}

// --- helpers ---------------------------------------------------------------

export function defaultsOf(sys: CardSystem) {
  const values: Record<string, string> = {};
  const modes: Record<string, FillMode> = {};
  for (const f of sys.fields) {
    values[f.id] = f.default;
    modes[f.id] = 'locked';
  }
  return { values, modes };
}

export function segmentsToText(segments: PromptSegment[]) {
  return segments.map((s) => s.text).join('');
}

export const IMPACT_META: Record<Impact, { label: string; cls: string; dot: string }> = {
  high: { label: '決定性', cls: 'text-rose-300 border-rose-400/40 bg-rose-400/10', dot: 'bg-rose-400' },
  mid: { label: '明顯', cls: 'text-amber-300 border-amber-400/40 bg-amber-400/10', dot: 'bg-amber-400' },
  low: { label: '微調', cls: 'text-slate-400 border-slate-500/40 bg-slate-500/10', dot: 'bg-slate-500' },
};
