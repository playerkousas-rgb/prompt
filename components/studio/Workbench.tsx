'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Settings2, Sparkles, RotateCcw, Home, Wand2, Loader2, SlidersHorizontal, Gauge } from 'lucide-react';

import type { CardSystem, ExtraOutput, FillMode, JsonLine } from '@/lib/card/types';
import { defaultsOf } from '@/lib/card/types';
import { ASPECTS, getProvider, providerTakesReference } from '@/lib/providers';
import { useLocal } from '@/lib/useLocal';

import { HighlightProvider, useHighlight } from './HighlightContext';
import { FieldPanel } from './FieldPanel';
import { CardAnatomy } from './CardAnatomy';
import { PromptPanel } from './PromptPanel';
import { ResultPanel } from './ResultPanel';
import { SettingsModal, type GenSettings } from './SettingsModal';
import { ReferenceUpload } from './ReferenceUpload';
import { ReferenceGuide } from './ReferenceGuide';
import { hasReference } from '@/lib/card/reference';

export type SysState = { values: Record<string, string>; modes: Record<string, FillMode> };

export interface WorkbenchProps {
  /** 這條產品線的系統清單（做卡＝三套卡牌；做章＝紀念章 + 巾圈） */
  systems: CardSystem[];
  /** localStorage 的前綴，例如 'ps.card' / 'ps.badge' */
  storagePrefix: string;
  title: string;
  subtitle: string;
  /** 中欄解剖圖分頁的名字 */
  anatomyTab: string;
  /**
   * 要顯示 / 複製 / 送去出圖的那一份輸出。
   * 做卡用 buildClassic，做章直接用 system.build。
   */
  output: (system: CardSystem, state: SysState) => { lines: JsonLine[]; plain: string; extras?: ExtraOutput[] };
  /** 做卡才有的參考照片流程 */
  reference?: boolean;
  /** 預設長寬比 */
  defaultAspect?: string;
}

/**
 * 做卡 / 做章共用的三欄工作台。
 *
 * 左：欄位（簡易 / 進階）｜中：解剖圖與出圖結果｜右：唯一那份提示詞。
 * 產品線之間的差異全部收在 props 裡，元件本身不認識任何一種卡或章。
 */
export function Workbench(props: WorkbenchProps) {
  return (
    <HighlightProvider>
      <Inner {...props} />
    </HighlightProvider>
  );
}

function Inner({
  systems,
  storagePrefix,
  title,
  subtitle,
  anatomyTab,
  output,
  reference = false,
  defaultAspect = 'portrait',
}: WorkbenchProps) {
  const [systemId, setSystemId] = useLocal<string>(`${storagePrefix}.system`, systems[0].id);
  const system = systems.find((s) => s.id === systemId) ?? systems[0];

  const [store, setStore, storeReady] = useLocal<Record<string, SysState>>(`${storagePrefix}.values`, {});
  const [settings, setSettings] = useLocal<GenSettings>('ps.gen.settings', {
    provider: 'pollinations',
    model: 'flux',
    keys: {},
  });
  const [aspect, setAspect] = useLocal<string>('ps.gen.aspect', defaultAspect);
  const [simple, setSimple] = useLocal<boolean>(`${storagePrefix}.simple`, true);

  /** 參考圖只放在記憶體（可能好幾 MB，塞 localStorage 會爆） */
  const [refImage, setRefImage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [centerTab, setCenterTab] = useState<'anatomy' | 'result'>('anatomy');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { flash } = useHighlight();

  // 確保目前系統有預設值；舊存檔缺的欄位只「補上」，不整包取代
  useEffect(() => {
    if (!storeReady) return;
    const cur = store[system.id];
    const def = defaultsOf(system);
    if (!cur) {
      setStore((s) => ({ ...s, [system.id]: def }));
      return;
    }
    const missing = system.fields.filter((f) => cur.values[f.id] === undefined);
    if (missing.length) {
      setStore((s) => {
        const c = s[system.id] ?? def;
        const values = { ...c.values };
        const modes = { ...c.modes };
        for (const f of missing) {
          values[f.id] = f.default;
          modes[f.id] = modes[f.id] ?? 'locked';
        }
        return { ...s, [system.id]: { values, modes } };
      });
    }
  }, [storeReady, store, system, setStore]);

  const state: SysState = store[system.id] ?? defaultsOf(system);

  const setValue = useCallback(
    (id: string, value: string) => {
      flash(id);
      setStore((s) => {
        const cur = s[system.id] ?? defaultsOf(system);
        return { ...s, [system.id]: { ...cur, values: { ...cur.values, [id]: value } } };
      });
    },
    [setStore, system, flash]
  );

  const setMode = useCallback(
    (id: string, mode: FillMode) => {
      flash(id);
      setStore((s) => {
        const cur = s[system.id] ?? defaultsOf(system);
        return { ...s, [system.id]: { ...cur, modes: { ...cur.modes, [id]: mode } } };
      });
    },
    [setStore, system, flash]
  );

  const reset = () => {
    if (!confirm(`要把「${system.label}」的所有欄位還原成預設值嗎？`)) return;
    setStore((s) => ({ ...s, [system.id]: defaultsOf(system) }));
  };

  const result = useMemo(() => system.build(state.values, state.modes), [system, state]);
  const out = useMemo(() => output(system, state), [output, system, state]);

  const [focusField, setFocusField] = useState<string | null>(null);
  const pickField = (id: string) => {
    setFocusField(id);
    setTimeout(() => {
      document.getElementById(`field-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  // 遊戲王「只要插圖」、以及章／巾圈這種方形成品，自動建議正方形
  useEffect(() => {
    const wantsSquare =
      (system.id === 'yugioh' && state.values.output_target === 'artwork') ||
      system.viewBox?.w === system.viewBox?.h;
    if (wantsSquare && aspect !== 'square') setAspect('square');
  }, [system.id, state.values.output_target]); // eslint-disable-line react-hooks/exhaustive-deps

  const provider = getProvider(settings.provider);
  const refOn = reference && hasReference(state.values);
  const refTakesImage = providerTakesReference(settings.provider, settings.model);
  const aspectDef = ASPECTS.find((a) => a.value === aspect) ?? ASPECTS[0];
  const needsKey = !provider.free && !settings.keys[provider.id];

  const generate = async () => {
    setLoading(true);
    setError(null);
    setCenterTab('result');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.keys[settings.provider] ?? '',
          model: settings.model,
          prompt: out.plain,
          refImage: refOn && refTakesImage ? refImage : null,
          negative: result.negative,
          width: aspectDef.w,
          height: aspectDef.h,
          aspect: aspectDef.ar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '生圖失敗');
      setImageUrl(data.imageUrl);
    } catch (e: any) {
      setError(e?.message || '生圖失敗，請檢查網路或 API Key');
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const aiCount = Object.entries(state.modes).filter(([, m]) => m === 'ai').length;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 backdrop-blur">
        <Link href="/" className="btn-ghost !px-2 !py-1.5" title="回首頁">
          <Home size={15} />
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-tight text-slate-100">{title}</span>
          <span className="hidden text-[11px] text-slate-500 sm:inline">{subtitle}</span>
        </div>

        <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          {systems.map((s) => (
            <button
              key={s.id}
              onClick={() => setSystemId(s.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                s.id === system.id ? 'text-slate-950' : 'text-slate-400 hover:text-slate-100'
              }`}
              style={s.id === system.id ? { background: s.accent } : undefined}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {([
              [true, '簡易', <Gauge key="s" size={12} />],
              [false, '進階', <SlidersHorizontal key="p" size={12} />],
            ] as [boolean, string, React.ReactNode][]).map(([v, label, icon]) => (
              <button
                key={label}
                onClick={() => setSimple(v)}
                title={v ? '只問最關鍵的幾格，其餘用預設值' : '開放全部欄位細調'}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  simple === v ? 'bg-slate-200 text-slate-950' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          {aiCount > 0 && (
            <span className="hidden items-center gap-1 rounded-lg border border-violet-400/40 bg-violet-400/10 px-2 py-1 text-[11px] text-violet-300 md:inline-flex">
              <Sparkles size={11} /> {aiCount} 格交給 AI
            </span>
          )}
          <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={reset} title="還原預設值">
            <RotateCcw size={13} /> <span className="hidden sm:inline">重設</span>
          </button>
          <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={13} />
            <span className="hidden sm:inline">出圖設定</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${needsKey ? 'bg-amber-400' : 'bg-emerald-400'}`}
              title={needsKey ? '這家供應商還沒填 Key' : '可以出圖'}
            />
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-12 xl:overflow-hidden">
        <section className="panel flex min-h-[460px] flex-col overflow-hidden xl:col-span-4 xl:min-h-0">
          <FieldPanel
            system={system}
            values={state.values}
            modes={state.modes}
            onChange={setValue}
            onModeChange={setMode}
            focusField={focusField}
            simple={simple}
            slot={refOn ? <ReferenceGuide kind={state.values.ref_use} /> : null}
          />
        </section>

        <section className="panel flex min-h-[560px] flex-col overflow-hidden xl:col-span-4 xl:min-h-0">
          <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-800 p-3">
            {([
              ['anatomy', anatomyTab],
              ['result', '出圖結果'],
            ] as ['anatomy' | 'result', string][]).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setCenterTab(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  centerTab === k
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {v}
                {k === 'result' && imageUrl && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
                )}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {centerTab === 'anatomy' ? (
              <CardAnatomy system={system} onPickField={pickField} simple={simple} />
            ) : (
              <ResultPanel imageUrl={imageUrl} loading={loading} error={error} provider={provider.label} />
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t border-slate-800 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="field-input !w-auto flex-1 !py-1.5 text-xs"
                value={aspect}
                onChange={(e) => setAspect(e.target.value)}
              >
                {ASPECTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <button className="btn-primary !py-2" onClick={generate} disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                {loading ? '生成中' : '生成圖片'}
              </button>
            </div>
            {refOn &&
              (refTakesImage ? (
                <ReferenceUpload image={refImage} onImage={setRefImage} kind={state.values.ref_use} />
              ) : (
                <p className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-center text-[11px] leading-snug text-slate-400">
                  站內這個供應商只吃文字。要附照片，請把右欄的提示詞複製到會讀圖的工具
                  （ChatGPT、Gemini、即夢…），把照片放第一張。
                </p>
              ))}
            <p className="text-center text-[11px] text-slate-500">
              使用 <span className="text-slate-300">{provider.label}</span>
              {needsKey && <span className="text-amber-400"> · 尚未填入 API Key</span>}
              {provider.free && <span className="text-emerald-400"> · 免金鑰</span>}
            </p>
          </div>
        </section>

        <section className="panel flex min-h-[460px] flex-col overflow-hidden xl:col-span-4 xl:min-h-0">
          <PromptPanel
            system={system}
            lines={out.lines}
            plain={out.plain}
            extras={out.extras}
            onPickField={pickField}
            withReferenceNote={refOn}
          />
        </section>
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
}
