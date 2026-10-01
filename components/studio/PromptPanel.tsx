'use client';

import React, { useState } from 'react';
import { Check, Copy, Ban } from 'lucide-react';
import type { BuildResult, CardSystem } from '@/lib/card/types';
import { useHighlight } from './HighlightContext';

type Tab = 'text' | 'json' | 'negative';

export function PromptPanel({
  system,
  result,
  onPickField,
}: {
  system: CardSystem;
  result: BuildResult;
  onPickField: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('text');
  const [copied, setCopied] = useState<string | null>(null);
  const { resolved, setActive, togglePin, flashing } = useHighlight();

  const jsonText = result.jsonLines.map((l) => l.text).join('\n');
  const payload = tab === 'json' ? jsonText : tab === 'negative' ? result.negative : result.plain;

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
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
      <div className="flex items-center gap-1.5 border-b border-slate-800 p-3">
        {([
          ['text', '自然語言'],
          ['json', '結構化 JSON'],
          ['negative', '負面提示'],
        ] as [Tab, string][]).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === k ? 'bg-cyan-400 text-slate-950' : 'border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {v}
          </button>
        ))}
        <div className="ml-auto">
          <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => copy(tab, payload)}>
            {copied === tab ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied === tab ? '已複製' : '複製'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'text' && (
          <p className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.85] text-slate-300">
            {result.segments.map((s, i) => (
              <span key={i} {...segProps(s.fieldId, s.ai)}>
                {s.text}
              </span>
            ))}
          </p>
        )}

        {tab === 'json' && (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.75] text-slate-300">
            {result.jsonLines.map((l, i) => (
              <span key={i} className="block">
                <span {...segProps(l.fieldId, l.ai)}>{l.text}</span>
              </span>
            ))}
          </pre>
        )}

        {tab === 'negative' && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
              <Ban size={13} className="mt-0.5 shrink-0 text-rose-400" />
              <span>
                負面提示詞告訴模型「不要出現什麼」。Stability 會直接吃這段；OpenAI 與 Gemini
                不支援獨立欄位，系統會自動忽略。
              </span>
            </p>
            <p className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.85] text-slate-300">
              {result.negative}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
        <span>
          {tab === 'json' ? `${result.jsonLines.length} 行` : `${payload.length} 字元`}
        </span>
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
