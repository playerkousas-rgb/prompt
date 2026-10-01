'use client';

import React, { useState } from 'react';
import { Check, Copy, Info, Image as ImageIcon } from 'lucide-react';
import type { BuildResult, CardSystem, FillMode } from '@/lib/card/types';
import { buildClassic } from '@/lib/card/classic';
import { hasReference } from '@/lib/card/reference';
import { useHighlight } from './HighlightContext';

/**
 * 右欄：**只有一份**提示詞。
 *
 * 以前這裡有四個分頁（經典 JSON / 自然語言 / 結構化 JSON / 負面提示），
 * 但使用者根本不知道該挑哪一個 —— 所以現在只留實測最穩的那一份，
 * 負面提示也併進同一份 JSON 的 negative_prompt 鍵裡，整段複製就能用。
 */
export function PromptPanel({
  system,
  result,
  values,
  modes,
  onPickField,
  onActivePrompt,
}: {
  system: CardSystem;
  result: BuildResult;
  values: Record<string, string>;
  modes: Record<string, FillMode>;
  onPickField: (id: string) => void;
  /** 回報「要拿去出圖的提示詞」 */
  onActivePrompt: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { resolved, setActive, togglePin, flashing } = useHighlight();

  const out = React.useMemo(
    () => buildClassic(system.id, system.fields, values, modes),
    [system, values, modes]
  );

  React.useEffect(() => {
    onActivePrompt(out.plain);
  }, [out.plain, onActivePrompt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(out.plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const label = (id?: string) => (id ? system.fields.find((f) => f.id === id)?.label : undefined);

  const segProps = (fieldId?: string, ai?: boolean) => ({
    className: [
      'seg',
      fieldId && resolved === fieldId ? 'is-active' : '',
      ai ? 'is-ai' : '',
      fieldId && flashing[fieldId] ? 'is-flash' : '',
    ]
      .filter(Boolean)
      .join(' '),
    'data-linked': fieldId ? 'true' : 'false',
    title: fieldId ? `來自欄位：${label(fieldId)}${ai ? '（AI 代填）' : ''} — 點擊跳到該欄位` : undefined,
    onMouseEnter: () => fieldId && setActive(fieldId),
    onMouseLeave: () => setActive(null),
    onClick: () => {
      if (!fieldId) return;
      togglePin(fieldId);
      onPickField(fieldId);
    },
  });

  const withRef = hasReference(values);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800 p-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-200">提示詞（整段複製就能用）</h2>
          <p className="truncate text-[11px] text-slate-500">
            {out.jsonLines.length} 行 · {out.plain.length} 字元 · 含負面提示
          </p>
        </div>
        <button className="btn-primary ml-auto !py-2" onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? '已複製' : '複製提示詞'}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
          <Info size={13} className="mt-0.5 shrink-0 text-cyan-400" />
          <span>
            這一份給 ChatGPT、Gemini、即夢、Midjourney 都能直接吃。
            滑過任何一行會亮出<span className="text-cyan-300">是哪一格</span>生出來的，點一下可以跳過去改。
          </span>
        </p>

        {withRef && (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-200/85">
            <ImageIcon size={13} className="mt-0.5 shrink-0 text-amber-400" />
            <span>
              你選了附參考圖：貼上這段提示詞時，<strong className="text-amber-200">記得把照片也一起上傳</strong>，
              而且要放在<strong className="text-amber-200">第一張</strong> —— 提示詞裡的
              <code className="mx-1 text-amber-200">reference_image</code>
              指的就是它。
            </span>
          </p>
        )}

        <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.75] text-slate-300">
          {out.jsonLines.map((l, i) => (
            <span key={i} className="block">
              <span {...segProps(l.fieldId, l.ai)}>{l.text}</span>
            </span>
          ))}
        </pre>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
        <span>出圖按鈕送出的就是這一份</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-cyan-400/70" /> 連動中
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-violet-400/70" /> AI 代填
          </span>
        </span>
      </div>
    </div>
  );
}
