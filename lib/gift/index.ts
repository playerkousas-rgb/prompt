import { keyVisualSystem } from './systems/keyvisual';
import type { CardSystem } from '../schema/types';

/** 紀念品產品線：目前就一套 —— 一張平面主視覺，套用到任意品項 */
export const GIFT_SYSTEMS: CardSystem[] = [keyVisualSystem];

export function getGiftSystem(id: string) {
  return GIFT_SYSTEMS.find((s) => s.id === id) ?? GIFT_SYSTEMS[0];
}
