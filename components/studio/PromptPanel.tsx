'use client';

import React, { useState } from 'react';
import { Check, Copy, Ban, Archive } from 'lucide-react';
import type { BuildResult, CardSystem, FillMode } from '@/lib/card/types';
import { buildClassic } from '@/lib/card/classic';
import { useHighlight } from './HighlightContext';

type Tab = 'text' | 'json' | 'classic' | 'negative';

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
  /** 回報「目前顯示中的提示詞」，生圖時就送這一份 */
  onActivePrompt: (text: string) => void;
}) {
  // 預設停在 test1 原版格式 —— 這份輸出的完成度最高
  const [tab, setTab] = useState<Tab>('classic');
  const [copied, setCopied] = useState<string | null>(null);
  const { resolved, setActive, togglePin, flashing } = useHighlight();

  const classic = React.useMemo(
    () => buildClassic(system.id, system.fields, values, modes),
    [system, values, modes]
  );

  const jsonText = result.jsonLines.map((l) => l.text).join('\n');
  const payload =
    tab === 'json' ? jsonText
    : tab === 'classic' ? classic.plain
    : tab === 'negative' ? result.negative
    : result.plain;

  React.useEffect(() => {
    onActivePrompt(tab === 'negative' ? result.plain : payload);
  }, [tab, payload, result.plain, onActivePrompt]);

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
          ['classic', '經典 JSON'],
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
        <div className="ml-auto flex items-center gap-2">
          {tab !== 'negative' && (
            <span className="hidden items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300 lg:inline-flex">
              生圖會用這份
            </span>
          )}
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

        {tab === 'classic' && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-200/80">
              <Archive size={13} className="mt-0.5 shrink-0 text-amber-400" />
              <span>
                這是 <strong className="text-amber-200">test1 原版格式</strong>，一字未改：鍵的順序、各屬性的中文背景字典、
                預設值、以及 <code className="text-amber-200">hair / clothing</code> 的「參考我上傳的第一張圖」
                都原封保留，適合搭配真人照片做圖生圖。
              </span>
            </p>
            <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.75] text-slate-300">
              {classic.jsonLines.map((l, i) => (
                <span key={i} className="block">
                  <span {...segProps(l.fieldId, l.ai)}>{l.text}</span>
                </span>
              ))}
            </pre>
          </div>
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
          {tab === 'json'
            ? `${result.jsonLines.length} 行`
            : tab === 'classic'
            ? `${classic.jsonLines.length} 行 · test1 原版格式`
            : `${payload.length} 字元`}
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
