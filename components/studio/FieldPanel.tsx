'use client';

import React, { useMemo, useState } from 'react';
import { Lock, Sparkles, Pin, Info } from 'lucide-react';
import type { CardSystem, FieldDef, FillMode, GroupId } from '@/lib/card/types';
import { GROUPS, IMPACT_META } from '@/lib/card/types';
import { useHighlight } from './HighlightContext';

interface Props {
  system: CardSystem;
  values: Record<string, string>;
  modes: Record<string, FillMode>;
  onChange: (id: string, value: string) => void;
  onModeChange: (id: string, mode: FillMode) => void;
  focusField: string | null;
}

export function FieldPanel({ system, values, modes, onChange, onModeChange, focusField }: Props) {
  const [group, setGroup] = useState<GroupId>('subject');
  const { resolved, setActive, togglePin, pinned } = useHighlight();

  // 從卡面點進來的欄位 → 自動切到它所在的分頁
  React.useEffect(() => {
    if (!focusField) return;
    const f = system.fields.find((x) => x.id === focusField);
    if (f) setGroup(f.group);
  }, [focusField, system]);

  const byGroup = useMemo(() => {
    const m = new Map<GroupId, FieldDef[]>();
    for (const f of system.fields) {
      if (!m.has(f.group)) m.set(f.group, []);
      m.get(f.group)!.push(f);
    }
    return m;
  }, [system]);

  const groups = GROUPS.filter((g) => byGroup.has(g.id));
  const current = byGroup.get(group) ?? [];
  const meta = GROUPS.find((g) => g.id === group);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 p-3">
        {groups.map((g) => {
          const fs = byGroup.get(g.id)!;
          const high = fs.filter((f) => f.impact === 'high').length;
          return (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                group === g.id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {g.label}
              {high > 0 && (
                <span
                  className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                    group === g.id ? 'bg-slate-900/60' : 'bg-rose-400'
                  }`}
                  title={`${high} 個決定性欄位`}
                />
              )}
            </button>
          );
        })}
      </div>

      {meta && (
        <p className="border-b border-slate-800/60 bg-slate-950/40 px-4 py-2 text-[11px] text-slate-500">
          {meta.desc}
        </p>
      )}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {current
          .slice()
          .sort((a, b) => rank(a.impact) - rank(b.impact))
          .map((f) => (
            <FieldRow
              key={f.id}
              field={f}
              value={values[f.id] ?? ''}
              mode={modes[f.id] ?? 'locked'}
              active={resolved === f.id}
              isPinned={pinned === f.id}
              onHover={setActive}
              onPin={togglePin}
              onChange={onChange}
              onModeChange={onModeChange}
            />
          ))}
      </div>
    </div>
  );
}

function rank(i: FieldDef['impact']) {
  return i === 'high' ? 0 : i === 'mid' ? 1 : 2;
}

function FieldRow({
  field: f,
  value,
  mode,
  active,
  isPinned,
  onHover,
  onPin,
  onChange,
  onModeChange,
}: {
  field: FieldDef;
  value: string;
  mode: FillMode;
  active: boolean;
  isPinned: boolean;
  onHover: (id: string | null) => void;
  onPin: (id: string) => void;
  onChange: (id: string, v: string) => void;
  onModeChange: (id: string, m: FillMode) => void;
}) {
  const im = IMPACT_META[f.impact];
  const ai = mode === 'ai';

  return (
    <div
      id={`field-${f.id}`}
      className={`field-row ${active ? 'is-active' : 'hover:border-slate-700/70 hover:bg-slate-800/30'}`}
      onMouseEnter={() => onHover(f.id)}
      onFocusCapture={() => onHover(f.id)}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <button
          onClick={() => onPin(f.id)}
          className={`shrink-0 rounded p-0.5 transition ${
            isPinned ? 'text-cyan-300' : 'text-slate-600 hover:text-slate-400'
          }`}
          title={isPinned ? '取消釘選' : '釘選這個欄位（高亮不會消失）'}
        >
          <Pin size={12} fill={isPinned ? 'currentColor' : 'none'} />
        </button>

        <label className="flex-1 truncate text-xs font-semibold text-slate-200">{f.label}</label>

        <span
          className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-medium ${im.cls}`}
          title="這個欄位對成品的影響力"
        >
          {im.label}
        </span>

        {f.aiFillable && (
          <button
            onClick={() => onModeChange(f.id, ai ? 'locked' : 'ai')}
            className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[10px] font-medium transition ${
              ai
                ? 'border-violet-400/60 bg-violet-400/15 text-violet-300'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title={ai ? '目前交給 AI 發揮，點擊改回自己填' : '點擊改成交給生圖 AI 自由發揮'}
          >
            {ai ? <Sparkles size={10} /> : <Lock size={10} />}
            {ai ? 'AI 代填' : '鎖定'}
          </button>
        )}
      </div>

      <div className={ai ? 'pointer-events-none opacity-35' : ''}>
        <Control field={f} value={value} onChange={(v) => onChange(f.id, v)} />
      </div>

      <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-slate-500">
        <Info size={11} className="mt-0.5 shrink-0" />
        <span>
          {ai ? (
            <span className="text-violet-300/90">
              已交給 AI：出圖時會請模型自己想一個「{f.label}」，你填的內容不會被使用。
            </span>
          ) : (
            f.hint
          )}
        </span>
      </p>
    </div>
  );
}

function Control({
  field: f,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const c = f.control;

  if (c.kind === 'textarea') {
    return (
      <textarea
        className="field-input resize-y"
        rows={c.rows ?? 2}
        placeholder={c.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (c.kind === 'number') {
    return (
      <input
        type="number"
        className="field-input"
        min={c.min}
        max={c.max}
        step={c.step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (c.kind === 'select') {
    const opt = c.options.find((o) => o.value === value);
    return (
      <>
        <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
          {c.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {opt?.desc && <p className="mt-1 text-[11px] text-cyan-300/70">{opt.desc}</p>}
      </>
    );
  }

  if (c.kind === 'chips') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {c.options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              title={o.desc}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                on
                  ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {o.swatch && (
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/40"
                  style={{ background: o.swatch }}
                />
              )}
              {o.label}
            </button>
          );
        })}
        {(() => {
          const opt = c.options.find((o) => o.value === value);
          return opt?.desc ? (
            <p className="mt-0.5 w-full text-[11px] text-cyan-300/70">{opt.desc}</p>
          ) : null;
        })()}
      </div>
    );
  }

  return (
    <input
      type="text"
      className="field-input"
      placeholder={c.kind === 'text' ? c.placeholder : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
