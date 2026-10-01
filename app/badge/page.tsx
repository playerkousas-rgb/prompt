'use client';

import React, { useCallback } from 'react';

import { BADGE_SYSTEMS } from '@/lib/badge';
import type { CardSystem } from '@/lib/card/types';
import { Workbench, type SysState } from '@/components/studio/Workbench';

export default function BadgeStudioPage() {
  // 做章 / 巾圈直接用該系統的 build()：主提示詞 + （紀念章才有的）工廠規格單
  const output = useCallback((system: CardSystem, state: SysState) => {
    const r = system.build(state.values, state.modes);
    return { lines: r.jsonLines, plain: r.plain, extras: r.extras };
  }, []);

  return (
    <Workbench
      systems={BADGE_SYSTEMS}
      storagePrefix="ps.badge"
      title="做章"
      subtitle="Badge & Woggle Studio"
      anatomyTab="章面對照圖"
      output={output}
      defaultAspect="square"
    />
  );
}
