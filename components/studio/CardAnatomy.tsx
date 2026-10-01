'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImageUp, RotateCcw, Layers2 } from 'lucide-react';
import type { CardSystem } from '@/lib/card/types';
import { useHighlight } from './HighlightContext';


export function CardAnatomy({
  system,
  onPickField,
  simple = false,
}: {
  system: CardSystem;
  onPickField: (fieldId: string) => void;
  /** 簡易模式：藏掉換底圖、底圖濃度這些進階玩法 */
  simple?: boolean;
}) {
  const { resolved, setActive, togglePin } = useHighlight();
  const VB_W = system.viewBox?.w ?? 630;
  const VB_H = system.viewBox?.h ?? 880;
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [variant, setVariant] = useState(0);
  const [opacity, setOpacity] = useState(45);
  const fileRef = useRef<HTMLInputElement>(null);

  // 換系統時把自訂底圖清掉，回到該系統的預設底圖
  useEffect(() => {
    setCustomImage(null);
    setVariant(0);
  }, [system.id]);

  const variants = system.baseImages ?? [];
  const maxW = (system.viewBox?.w ?? 630) >= (system.viewBox?.h ?? 880) ? 'max-w-[420px]' : 'max-w-[330px]';
  const current = variants[Math.min(variant, Math.max(variants.length - 1, 0))];
  const baseSrc = customImage ?? current?.src ?? null;
  const fieldLabel = (id: string) => system.fields.find((f) => f.id === id)?.label ?? id;

  const isZoneActive = (fieldIds: string[]) => !!resolved && fieldIds.includes(resolved);
  const activeZones = system.zones.filter((z) => isZoneActive(z.fieldIds));
  // 插圖窗 / 卡框這種大區塊，只有在沒有更精確的小區塊命中時才亮
  const hasPreciseHit = activeZones.some((z) => z.tone !== 'soft');

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">{system.anatomyLabel ?? '卡面對照圖'}</h2>
          <p className="text-[11px] text-slate-500">
            滑過左邊欄位 → 這裡對應的位置會亮起來。{system.ratio}
          </p>
        </div>
        <div className={`flex shrink-0 items-center gap-1 ${simple ? 'hidden' : ''}`}>
          <button
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
            title="換成你自己的參考卡圖（只存在你的瀏覽器，不會上傳）"
            onClick={() => fileRef.current?.click()}
          >
            <ImageUp size={14} /> 換底圖
          </button>
          {customImage && (
            <button
              className="btn-ghost !px-2 !py-1.5"
              title="回到預設底圖"
              onClick={() => setCustomImage(null)}
            >
              <RotateCcw size={14} />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fr = new FileReader();
              fr.onload = () => setCustomImage(fr.result as string);
              fr.readAsDataURL(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {!simple && !customImage && variants.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {variants.map((v, i) => {
            const on = i === variant;
            return (
              <button
                key={v.id}
                onClick={() => setVariant(i)}
                title={v.desc}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                  on
                    ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}

      <div className={`relative mx-auto w-full ${maxW}`}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full rounded-[22px] border border-slate-700 bg-slate-950 shadow-2xl"
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id="cardbg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#111c2e" />
              <stop offset="100%" stopColor="#0a1220" />
            </linearGradient>
            <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M22 0 L0 0 0 22" fill="none" stroke="rgba(148,163,184,0.07)" strokeWidth="1" />
            </pattern>
            <clipPath id="cardclip">
              <rect x="0" y="0" width={VB_W} height={VB_H} rx="26" />
            </clipPath>
          </defs>

          <g clipPath="url(#cardclip)">
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#cardbg)" />
            {!baseSrc && <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#grid)" />}

            {baseSrc && (
              <image
                href={baseSrc}
                x="0"
                y="0"
                width={VB_W}
                height={VB_H}
                preserveAspectRatio="xMidYMid slice"
                opacity={opacity / 100}
              />
            )}

            <rect x="0" y="0" width={VB_W} height="6" fill={system.accent} opacity="0.85" />
          </g>

          {system.zones.map((z) => {
            const soft = z.tone === 'soft';
            const act = isZoneActive(z.fieldIds) && (!soft || !hasPreciseHit);
            return (
              <g key={z.id}>
                <rect
                  className="zone-rect"
                  x={z.x}
                  y={z.y}
                  width={z.w}
                  height={z.h}
                  rx={soft ? 16 : 8}
                  fill={act ? 'rgba(34,211,238,0.3)' : 'rgba(8,15,28,0.28)'}
                  stroke={act ? '#22d3ee' : soft ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.45)'}
                  strokeWidth={act ? 3.5 : 1.4}
                  strokeDasharray={soft ? '7 6' : undefined}
                  onMouseEnter={() => setActive(z.fieldIds[0] ?? null)}
                  onClick={() => {
                    const first = z.fieldIds[0];
                    if (first) {
                      togglePin(first);
                      onPickField(first);
                    }
                  }}
                >
                  <title>{`${z.label}\n← ${z.fieldIds.map(fieldLabel).join('、')}`}</title>
                </rect>
                <text
                  className="zone-label"
                  x={z.x + 9}
                  y={z.y + (soft ? 25 : Math.min(z.h / 2 + 6, 23))}
                  fontSize={soft ? 17 : 15}
                  fill={act ? '#a5f3fc' : '#cbd5e1'}
                  stroke="rgba(2,6,16,0.85)"
                  strokeWidth="3.5"
                  paintOrder="stroke"
                  fontWeight={act ? 700 : 500}
                  opacity={act ? 1 : soft ? 0.6 : 0.85}
                >
                  {z.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 「這一塊由哪些欄位控制」—— 滑到哪、這裡就列出哪一塊的全部欄位 */}
      <div className="min-h-[58px] rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
        {activeZones.length ? (
          activeZones.slice(0, 2).map((z) => (
            <div key={z.id} className="mb-1 last:mb-0">
              <p className="text-[11px] font-semibold text-cyan-200">{z.label}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {z.fieldIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      togglePin(id);
                      onPickField(id);
                    }}
                    onMouseEnter={() => setActive(id)}
                    className={`rounded-md border px-1.5 py-px text-[10.5px] transition ${
                      resolved === id
                        ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {fieldLabel(id)}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-[11px] leading-snug text-slate-500">
            滑過左邊的欄位，或滑過上面任何一塊框 —— 這裡會列出
            <span className="text-slate-300">那一塊是由哪幾格決定的</span>。
          </p>
        )}
      </div>

      {baseSrc && !simple && (
        <div className="flex items-center gap-2 px-1">
          <Layers2 size={13} className="shrink-0 text-slate-500" />
          <span className="shrink-0 text-[11px] text-slate-500">底圖濃度</span>
          <input
            type="range"
            min={0}
            max={85}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[11px] text-slate-400">{opacity}%</span>
        </div>
      )}

      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        {customImage ? (
          <>你自己的參考卡圖（只在這台電腦，沒有上傳）。</>
        ) : current ? (
          <>
            底圖：<span className="text-slate-300">{current.desc}</span>
            <br />
            由 test1 的經典 JSON 格式生成，純粹用來對照版面位置，不是成品預覽。
          </>
        ) : (
          <>版面對照示意圖，不是成品預覽。</>
        )}
        <br />
        點一下區塊可以把對應欄位<span className="text-cyan-300">釘選</span>住。
      </p>
    </div>
  );
}
