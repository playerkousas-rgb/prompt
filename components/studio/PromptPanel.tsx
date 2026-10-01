'use client';

import React, { useState } from 'react';
import { Check, Copy, Info, Image as ImageIcon, FileText } from 'lucide-react';
import type { CardSystem, ExtraOutput, JsonLine } from '@/lib/card/types';
import { useHighlight } from './HighlightContext';

/**
 * 右欄：**一份**主提示詞（＋視產品而定的附加輸出，例如做章的工廠規格單）。
 *
 * 以前做卡這裡有四個分頁，使用者根本不知道該挑哪個，所以現在只給最穩的那一份。
 * 附加輸出不是「另一種選擇」，而是**給不同對象看的不同文件**（AI vs 工廠），
 * 所以用一塊明確標示的區塊放在下面，而不是分頁。
 */
export function PromptPanel({
  system,
  lines,
  plain,
  extras,
  onPickField,
  withReferenceNote,
}: {
  system: CardSystem;
  lines: JsonLine[];
  plain: string;
  extras?: ExtraOutput[];
  onPickField: (id: string) => void;
  /** 做卡的「我有附照片」提醒 */
  withReferenceNote?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const { resolved, setActive, togglePin, flashing } = useHighlight();

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800 p-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-200">提示詞（整段複製就能用）</h2>
          <p className="truncate text-[11px] text-slate-500">
            {lines.length} 行 · {plain.length} 字元 · 含負面提示
          </p>
        </div>
        <button className="btn-primary ml-auto !py-2" onClick={() => copy('main', plain)}>
          {copied === 'main' ? <Check size={15} /> : <Copy size={15} />}
          {copied === 'main' ? '已複製' : '複製提示詞'}
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

        {withReferenceNote && (
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
          {lines.map((l, i) => (
            <span key={i} className="block">
              <span {...segProps(l.fieldId, l.ai)}>{l.text}</span>
            </span>
          ))}
        </pre>

        {extras?.map((ex) => (
          <div key={ex.id} className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <FileText size={13} className="shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-emerald-200">{ex.label}</p>
                <p className="truncate text-[10.5px] text-slate-400">{ex.desc}</p>
              </div>
              <button
                className="btn-ghost shrink-0 !px-2.5 !py-1 text-[11px]"
                onClick={() => copy(ex.id, ex.text)}
              >
                {copied === ex.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied === ex.id ? '已複製' : '複製'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-[1.7] text-slate-300">
              {ex.text}
            </pre>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
        <span>出圖按鈕送出的就是上面那一份</span>
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
