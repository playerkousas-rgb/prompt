'use client';

import React, { useMemo, useState } from 'react';
import { Lock, Sparkles, Pin, Crosshair, Braces } from 'lucide-react';
import type { CardSystem, FieldDef, FillMode, GroupId } from '@/lib/card/types';
import { GROUPS, IMPACT_META, zoneSummary } from '@/lib/card/types';

import { useHighlight } from './HighlightContext';

interface Props {
  system: CardSystem;
  values: Record<string, string>;
  modes: Record<string, FillMode>;
  onChange: (id: string, value: string) => void;
  onModeChange: (id: string, mode: FillMode) => void;
  focusField: string | null;
  /** 簡易模式：只留非填不可的那幾格 */
  simple: boolean;
  /** 參考圖上傳區（簡易模式也看得到） */
  slot?: React.ReactNode;
}

/** 這一格在這個情境下該不該出現（例如沒附圖就不用問「要保留什麼特徵」） */
function isRelevant(f: FieldDef, values: Record<string, string>) {
  if ((f.id === 'ref_keep' || f.id === 'ref_strength') && (values.ref_use || 'none') === 'none') return false;
  // 系統自己宣告的條件（例如巾圈「編法」只有編織結類型才有意義）
  if (f.showIf && !f.showIf(values)) return false;
  return true;
}

export function FieldPanel({
  system,
  values,
  modes,
  onChange,
  onModeChange,
  focusField,
  simple,
  slot,
}: Props) {
  const [group, setGroup] = useState<GroupId>(() => (system.groups ?? GROUPS)[0].id);

  // 換產品線（做卡 ↔ 做章）時，分組要跟著重設
  React.useEffect(() => {
    const gs = system.groups ?? GROUPS;
    if (!gs.some((g) => g.id === group)) setGroup(gs[0].id);
  }, [system]); // eslint-disable-line react-hooks/exhaustive-deps
  const { resolved, setActive, togglePin, pinned } = useHighlight();

  // 從卡面點進來的欄位 → 自動切到它所在的分頁
  React.useEffect(() => {
    if (!focusField) return;
    const f = system.fields.find((x) => x.id === focusField);
    if (f) setGroup(f.group);
  }, [focusField, system]);

  const visible = useMemo(
    () => system.fields.filter((f) => isRelevant(f, values)),
    [system, values]
  );

  const byGroup = useMemo(() => {
    const m = new Map<GroupId, FieldDef[]>();
    for (const f of visible) {
      if (!m.has(f.group)) m.set(f.group, []);
      m.get(f.group)!.push(f);
    }
    return m;
  }, [visible]);

  const allGroups = system.groups ?? GROUPS;
  const groups = allGroups.filter((g) => byGroup.has(g.id));
  const meta = allGroups.find((g) => g.id === group);

  // 簡易模式：不分頁，只列必填的那幾格，照 主角 → 場景 → 畫風 → 卡面 的順序
  const simpleList = useMemo(() => {
    const order = allGroups.map((g) => g.id);
    return visible
      .filter((f) => f.essential)
      .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  }, [visible, allGroups]);

  const current = simple ? simpleList : (byGroup.get(group) ?? []).slice().sort((a, b) => rank(a.impact) - rank(b.impact));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {simple ? (
        <p className="border-b border-slate-800 px-4 py-2.5 text-[11px] leading-relaxed text-slate-400">
          <span className="font-semibold text-slate-200">簡易模式</span>：只問{simpleList.length} 格，
          其他都用實測過的預設值。想細調就切到右上角的「進階」。
        </p>
      ) : (
        <>
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
                  <span className={`ml-1.5 text-[10px] ${group === g.id ? 'text-slate-900/70' : 'text-slate-600'}`}>
                    {fs.length}
                  </span>
                  {high > 0 && (
                    <span
                      className={`ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${
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
        </>
      )}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {slot && <div className="mb-1 px-1">{slot}</div>}
        {current.map((f) => (
          <FieldRow
            key={f.id}
            field={f}
            system={system}
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
  system,
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
  system: CardSystem;
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
  const zones = zoneSummary(system, f.id);

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

      {/* 「這格到底控制什麼」—— 卡面位置 + 提示詞鍵，兩個都寫清楚 */}
      <div className="mt-1.5 space-y-1 text-[11px] leading-snug">
        <p className="flex items-start gap-1 text-slate-400">
          <Crosshair size={11} className="mt-0.5 shrink-0 text-cyan-400/80" />
          <span>
            <span className="text-slate-500">卡面位置：</span>
            <span className="text-cyan-200/90">{zones}</span>
          </span>
        </p>
        <p className="flex items-start gap-1 text-slate-500">
          <Braces size={11} className="mt-0.5 shrink-0 text-slate-600" />
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
