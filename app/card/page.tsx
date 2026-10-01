'use client';

import React, { useCallback } from 'react';

import { SYSTEMS } from '@/lib/card';
import { buildClassic } from '@/lib/card/classic';
import type { CardSystem } from '@/lib/card/types';
import { Workbench, type SysState } from '@/components/studio/Workbench';

export default function CardStudioPage() {
  // 做卡的輸出＝經典 JSON（test1 骨架 + 畫風 / 工藝 / 參考圖 / 負面提示）
  const output = useCallback((system: CardSystem, state: SysState) => {
    const o = buildClassic(system.id, system.fields, state.values, state.modes);
    return { lines: o.jsonLines, plain: o.plain };
  }, []);

  return (
    <Workbench
      systems={SYSTEMS}
      storagePrefix="ps.card"
      title="做卡"
      subtitle="Card Prompt Studio"
      anatomyTab="卡面對照圖"
      output={output}
      reference
      defaultAspect="portrait"
    />
  );
}
