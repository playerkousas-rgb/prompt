'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Settings2, Sparkles, RotateCcw, Home, Wand2, Loader2 } from 'lucide-react';

import { SYSTEMS, getSystem } from '@/lib/card';
import { defaultsOf, type FillMode } from '@/lib/card/types';
import { ASPECTS, getProvider } from '@/lib/providers';
import { useLocal } from '@/lib/useLocal';

import { HighlightProvider, useHighlight } from '@/components/studio/HighlightContext';
import { FieldPanel } from '@/components/studio/FieldPanel';
import { CardAnatomy } from '@/components/studio/CardAnatomy';
import { PromptPanel } from '@/components/studio/PromptPanel';
import { ResultPanel } from '@/components/studio/ResultPanel';
import { SettingsModal, type GenSettings } from '@/components/studio/SettingsModal';

export default function CardStudioPage() {
  return (
    <HighlightProvider>
      <Studio />
    </HighlightProvider>
  );
}

type SysState = { values: Record<string, string>; modes: Record<string, FillMode> };

function Studio() {
  const [systemId, setSystemId] = useLocal<string>('ps.card.system', 'pokemon');
  const system = getSystem(systemId);

  const [store, setStore, storeReady] = useLocal<Record<string, SysState>>('ps.card.values', {});
  const [settings, setSettings] = useLocal<GenSettings>('ps.gen.settings', {
    provider: 'pollinations',
    model: 'flux',
    keys: {},
  });
  const [aspect, setAspect] = useLocal<string>('ps.gen.aspect', 'portrait');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [centerTab, setCenterTab] = useState<'anatomy' | 'result'>('anatomy');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { flash } = useHighlight();

  // 確保目前系統有預設值
  useEffect(() => {
    if (!storeReady) return;
    if (!store[system.id]) {
      setStore((s) => ({ ...s, [system.id]: defaultsOf(system) }));
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

  const [focusField, setFocusField] = useState<string | null>(null);
  const pickField = (id: string) => {
    setFocusField(id);
    setTimeout(() => {
      document.getElementById(`field-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  // 遊戲王「只要插圖」時自動建議正方形
  useEffect(() => {
    if (system.id === 'yugioh' && state.values.output_target === 'artwork' && aspect !== 'square') {
      setAspect('square');
    }
  }, [system.id, state.values.output_target]); // eslint-disable-line react-hooks/exhaustive-deps

  const provider = getProvider(settings.provider);
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
          prompt: result.plain,
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
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 backdrop-blur">
        <Link href="/" className="btn-ghost !px-2 !py-1.5" title="回首頁">
          <Home size={15} />
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-tight text-slate-100">做卡</span>
          <span className="hidden text-[11px] text-slate-500 sm:inline">Card Prompt Studio</span>
        </div>

        <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          {SYSTEMS.map((s) => (
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

      {/* Body */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-12 xl:overflow-hidden">
        {/* 左：欄位 */}
        <section className="panel flex min-h-[460px] flex-col overflow-hidden xl:col-span-4 xl:min-h-0">
          <FieldPanel
            system={system}
            values={state.values}
            modes={state.modes}
            onChange={setValue}
            onModeChange={setMode}
            focusField={focusField}
          />
        </section>

        {/* 中：卡面對照圖 / 出圖結果 */}
        <section className="panel flex min-h-[560px] flex-col overflow-hidden xl:col-span-4 xl:min-h-0">
          <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-800 p-3">
            {([
              ['anatomy', '卡面對照圖'],
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
              <CardAnatomy system={system} onPickField={pickField} />
            ) : (
              <ResultPanel imageUrl={imageUrl} loading={loading} error={error} provider={provider.label} />
            )}
          </div>

          {/* 出圖列 */}
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
            <p className="text-center text-[11px] text-slate-500">
              使用 <span className="text-slate-300">{provider.label}</span>
              {needsKey && <span className="text-amber-400"> · 尚未填入 API Key</span>}
              {provider.free && <span className="text-emerald-400"> · 免金鑰</span>}
            </p>
          </div>
        </section>

        {/* 右：提示詞 */}
        <section className="panel flex min-h-[460px] flex-col overflow-hidden xl:col-span-4 xl:min-h-0">
          <PromptPanel system={system} result={result} onPickField={pickField} />
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
