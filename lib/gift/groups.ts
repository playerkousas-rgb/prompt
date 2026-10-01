import type { GroupDef } from '../schema/types';

/**
 * 紀念品的分組順序，就是使用者說的那句話的順序：
 * **先把平面圖設計完成，之後才是放在哪一種紀念品上。**
 */
export const GIFT_GROUPS: GroupDef[] = [
  { id: 'purpose', label: '用途', desc: '為了什麼做、給誰' },
  { id: 'visual', label: '主視覺', desc: '畫什麼、怎麼排 —— 這條線的核心' },
  { id: 'text', label: '文字', desc: '主標、副標與年份' },
  { id: 'style', label: '風格與配色', desc: '畫風與色數，色數直接等於成本' },
  { id: 'carrier', label: '載體與輸出', desc: '最後才管：要做成什麼東西、怎麼印' },
];
