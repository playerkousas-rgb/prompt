'use client';

import React, { useCallback } from 'react';

import { GIFT_SYSTEMS } from '@/lib/gift';
import type { CardSystem } from '@/lib/card/types';
import { Workbench, type SysState } from '@/components/studio/Workbench';

export default function GiftStudioPage() {
  // 主輸出＝平面主視覺的生圖 JSON；附件＝套用到各品項的提示詞 + 印製規格單
  const output = useCallback((system: CardSystem, state: SysState) => {
    const r = system.build(state.values, state.modes);
    return { lines: r.jsonLines, plain: r.plain, extras: r.extras };
  }, []);

  return (
    <Workbench
      systems={GIFT_SYSTEMS}
      storagePrefix="ps.gift"
      title="紀念品"
      subtitle="Souvenir Key Visual Studio"
      anatomyTab="版面對照圖"
      output={output}
      defaultAspect="square"
    />
  );
}
