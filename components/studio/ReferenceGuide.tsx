'use client';

import React from 'react';
import { ImageUp, ArrowRight } from 'lucide-react';

/**
 * 參考圖「怎麼用」的說明卡。
 *
 * 絕大多數人是把我們的 JSON 複製到 ChatGPT / Gemini / 即夢 去生圖，
 * 所以附圖這件事發生在**他們那邊**，不是在這裡上傳。
 * 這張卡的任務就是把那三個步驟講清楚，並確保提示詞裡的
 * 「第一張圖」跟他們實際上傳的順序對得起來。
 */
export function ReferenceGuide({ kind }: { kind: string }) {
  const what =
    kind === 'pet' ? '寵物照片' : kind === 'person' ? '人物照片' : kind === 'object' ? '物件 / 風景照' : '參考圖';

  const tip =
    kind === 'pet'
      ? '挑正面、光線足、花色看得清楚的那張；全身比大頭照好，AI 才知道比例。'
      : kind === 'person'
      ? '挑正臉、沒有濾鏡、五官清楚的那張；戴眼鏡或有特徵就在下一格寫出來。'
      : '挑角度單純、主體明確的那張，避免雜物太多。';

  return (
    <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan-100">
        <ImageUp size={13} /> 附圖要在你的 AI 那邊做
      </p>
      <ol className="mt-2 space-y-1.5 text-[11px] leading-snug text-slate-300">
        <li className="flex gap-1.5">
          <span className="shrink-0 font-mono text-cyan-400">1</span>
          <span>
            在 ChatGPT / Gemini / 即夢 開一個新對話，先把<strong className="text-cyan-200">{what}</strong>
            上傳上去 —— 一定要是<strong className="text-cyan-200">第一張</strong>。
          </span>
        </li>
        <li className="flex gap-1.5">
          <span className="shrink-0 font-mono text-cyan-400">2</span>
          <span>
            回來按右欄的「複製提示詞」，貼在同一則訊息裡送出。
          </span>
        </li>
        <li className="flex gap-1.5">
          <span className="shrink-0 font-mono text-cyan-400">3</span>
          <span>
            提示詞裡的 <code className="text-cyan-200">reference_image</code> 區塊會叫模型鎖住長相 / 花色，
            不滿意就改下面兩格再複製一次。
          </span>
        </li>
      </ol>
      <p className="mt-2 flex items-start gap-1 text-[10.5px] leading-snug text-slate-500">
        <ArrowRight size={11} className="mt-0.5 shrink-0" />
        {tip}
      </p>
    </div>
  );
}
