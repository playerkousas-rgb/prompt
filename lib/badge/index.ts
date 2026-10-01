import { patchSystem } from './systems/patch';
import { woggleSystem } from './systems/woggle';
import type { CardSystem } from '../schema/types';

/** 做章產品線：紀念章 + 巾圈（紀念品之後再加） */
export const BADGE_SYSTEMS: CardSystem[] = [patchSystem, woggleSystem];

export function getBadgeSystem(id: string) {
  return BADGE_SYSTEMS.find((s) => s.id === id) ?? BADGE_SYSTEMS[0];
}
