'use client';

import React, { useRef, useState } from 'react';
import { ImageUp, Eye, EyeOff, X } from 'lucide-react';
import type { CardSystem } from '@/lib/card/types';
import { useHighlight } from './HighlightContext';

const VB_W = 630;
const VB_H = 880;

export function CardAnatomy({
  system,
  onPickField,
}: {
  system: CardSystem;
  onPickField: (fieldId: string) => void;
}) {
  const { resolved, setActive, togglePin } = useHighlight();
  const [refImage, setRefImage] = useState<string | null>(null);
  const [showRef, setShowRef] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const fieldLabel = (id: string) => system.fields.find((f) => f.id === id)?.label ?? id;

  // 哪些區塊要亮
  const isZoneActive = (fieldIds: string[]) => !!resolved && fieldIds.includes(resolved);
  const activeZones = system.zones.filter((z) => isZoneActive(z.fieldIds));
  // 插圖窗/卡框這種包山包海的大區塊，只有在沒有更精確的小區塊時才亮
  const hasPreciseHit = activeZones.some((z) => z.tone !== 'soft');

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">卡面對照圖</h2>
          <p className="text-[11px] text-slate-500">
            滑過左邊欄位 → 這裡對應的位置會亮起來。{system.ratio}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {refImage && (
            <>
              <button
                className="btn-ghost !px-2 !py-1.5"
                title={showRef ? '隱藏參考圖' : '顯示參考圖'}
                onClick={() => setShowRef((v) => !v)}
              >
                {showRef ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button className="btn-ghost !px-2 !py-1.5" title="移除參考圖" onClick={() => setRefImage(null)}>
                <X size={14} />
              </button>
            </>
          )}
          <button
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
            title="上傳一張你自己的參考卡圖當底（只存在你的瀏覽器，不會上傳）"
            onClick={() => fileRef.current?.click()}
          >
            <ImageUp size={14} /> 參考底圖
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fr = new FileReader();
              fr.onload = () => setRefImage(fr.result as string);
              fr.readAsDataURL(f);
            }}
          />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[330px]">
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
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#grid)" />

            {refImage && showRef && (
              <image
                href={refImage}
                x="0"
                y="0"
                width={VB_W}
                height={VB_H}
                preserveAspectRatio="xMidYMid slice"
                opacity="0.55"
              />
            )}

            {/* 系統識別色的頂部細條 */}
            <rect x="0" y="0" width={VB_W} height="6" fill={system.accent} opacity="0.8" />
          </g>

          {/* 區塊 */}
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
                  fill={act ? 'rgba(34,211,238,0.22)' : soft ? 'rgba(148,163,184,0.03)' : 'rgba(148,163,184,0.06)'}
                  stroke={act ? '#22d3ee' : soft ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.35)'}
                  strokeWidth={act ? 3 : 1.4}
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
                  x={z.x + 10}
                  y={z.y + (soft ? 26 : Math.min(z.h / 2 + 6, 24))}
                  fontSize={soft ? 17 : 16}
                  fill={act ? '#a5f3fc' : 'rgba(148,163,184,0.75)'}
                  fontWeight={act ? 700 : 500}
                  opacity={act ? 1 : soft ? 0.55 : 0.8}
                >
                  {z.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        這是<span className="text-slate-300">版面對照示意圖</span>，不是成品預覽 —— 成品由右側 AI 生成。
        <br />
        點一下區塊可以把對應欄位<span className="text-cyan-300">釘選</span>住。
      </p>
    </div>
  );
}
