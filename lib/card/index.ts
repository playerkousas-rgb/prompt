import { pokemonSystem } from './systems/pokemon';
import { onePieceSystem } from './systems/onepiece';
import { yugiohSystem } from './systems/yugioh';
import type { CardSystem } from './types';

export const SYSTEMS: CardSystem[] = [pokemonSystem, onePieceSystem, yugiohSystem];

export function getSystem(id: string): CardSystem {
  return SYSTEMS.find((s) => s.id === id) ?? pokemonSystem;
}

export * from './types';
