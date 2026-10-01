import type { GroupDef } from '../schema/types';

/**
 * 做章的分組。
 *
 * 排序就是建議的思考順序：**先決定平面設計，工藝放最後**
 * —— 因為對生圖 AI 來說「電繡 / 織章」只是一句材質描述，
 * 真正決定章好不好看的是構圖、符號、文字排法與配色。
 */
export const BADGE_GROUPS: GroupDef[] = [
  { id: 'purpose', label: '用途', desc: '這個章要幹嘛、戴在哪、做多大' },
  { id: 'visual', label: '主視覺', desc: '章上面畫什麼、怎麼排 —— 影響最大的一組' },
  { id: 'text', label: '文字', desc: '繞在章上的中英文、年份與團號' },
  { id: 'style', label: '風格與配色', desc: '用什麼美術語言去畫，色數直接等於成本' },
  { id: 'craft', label: '工藝', desc: '最後再選。對生圖只是一句材質，對工廠才是規格' },
];

export const WOGGLE_GROUPS: GroupDef[] = [
  { id: 'purpose', label: '類型', desc: '用什麼做、給誰戴' },
  { id: 'visual', label: '造型', desc: '正面長什麼樣、有什麼圖案' },
  { id: 'text', label: '刻字', desc: '名字、團號、年份' },
  { id: 'style', label: '風格與配色', desc: '質感與顏色' },
];

/**
 * 組合章（一套幾片拼起來）。
 * 順序刻意是：先母版 → 再切法 → 才輪到每片 —— 這就是正確的設計順序，
 * 先把整張圖想完，再決定刀要落在哪裡。
 */
export const SET_GROUPS: GroupDef[] = [
  { id: 'master', label: '母版', desc: '整套拼起來是一張什麼圖、外框是什麼形狀' },
  { id: 'split', label: '切法', desc: '怎麼切、切幾片 —— 切縫就是設計的一部分' },
  { id: 'pieces', label: '每片', desc: '每一片各自的主角與文字' },
  { id: 'style', label: '風格與配色', desc: '全套必須共用同一套色，否則拼起來會打架' },
  { id: 'craft', label: '工藝', desc: '最後再選。每一片都要各自長出自己的邊' },
];
