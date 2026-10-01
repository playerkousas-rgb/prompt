'use client';

import React from 'react';
import { X, ExternalLink, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { PROVIDERS, type ProviderId } from '@/lib/providers';

export interface GenSettings {
  provider: ProviderId;
  model: string;
  keys: Record<string, string>;
}

export function SettingsModal({
  open,
  onClose,
  settings,
  setSettings,
}: {
  open: boolean;
  onClose: () => void;
  settings: GenSettings;
  setSettings: (s: GenSettings) => void;
}) {
  const [reveal, setReveal] = React.useState<Record<string, boolean>>({});
  if (!open) return null;

  const active = PROVIDERS.find((p) => p.id === settings.provider)!;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel my-8 w-full max-w-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">出圖設定</h2>
            <p className="text-[11px] text-slate-500">選一家供應商，填你自己的 API Key。</p>
          </div>
          <button className="btn-ghost !px-2 !py-1.5" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            <p className="text-[11.5px] leading-relaxed text-emerald-200/80">
              你的 Key 只存在這台電腦的瀏覽器 localStorage。出圖時會隨請求轉給供應商，
              伺服器端<strong className="text-emerald-300">用完即丟</strong> —— 不寫檔、不入庫、不記錄，也不會進版本控制。
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-300">供應商</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROVIDERS.map((p) => {
                const on = p.id === settings.provider;
                const hasKey = p.free || !!settings.keys[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={() => setSettings({ ...settings, provider: p.id, model: p.models[0].value })}
                    className={`rounded-xl border p-3 text-left transition ${
                      on ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{p.label}</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${hasKey ? 'bg-emerald-400' : 'bg-slate-600'}`}
                        title={hasKey ? '可以使用' : '尚未填入 Key'}
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-300">模型</p>
            <select
              className="field-input"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            >
              {active.models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {!active.free && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-300">{active.label} API Key</p>
                {active.keyUrl && (
                  <a
                    href={active.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                  >
                    去申請 <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type={reveal[active.id] ? 'text' : 'password'}
                  className="field-input font-mono"
                  placeholder={active.keyHint}
                  autoComplete="off"
                  value={settings.keys[active.id] ?? ''}
                  onChange={(e) =>
                    setSettings({ ...settings, keys: { ...settings.keys, [active.id]: e.target.value } })
                  }
                />
                <button
                  className="btn-ghost !px-2.5"
                  onClick={() => setReveal((r) => ({ ...r, [active.id]: !r[active.id] }))}
                >
                  {reveal[active.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {active.free && (
            <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11.5px] leading-relaxed text-slate-400">
              Pollinations 不需要任何金鑰，直接按「生成圖片」就會出圖。尖峰時段可能要等 10–40 秒。
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-800 px-5 py-4">
          <button className="btn-primary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
