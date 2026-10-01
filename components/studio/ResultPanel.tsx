'use client';

import React from 'react';
import { Download, ImageOff, Loader2, ExternalLink } from 'lucide-react';

export function ResultPanel({
  imageUrl,
  loading,
  error,
  provider,
}: {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  provider: string;
}) {
  const [imgLoading, setImgLoading] = React.useState(false);

  React.useEffect(() => {
    if (imageUrl) setImgLoading(true);
  }, [imageUrl]);

  const download = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `prompt-studio-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">出圖結果</h2>
          <p className="text-[11px] text-slate-500">
            {imageUrl ? `由 ${provider} 生成` : '還沒有圖片'}
          </p>
        </div>
        {imageUrl && (
          <div className="flex gap-1.5">
            <a href={imageUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-2 !py-1.5" title="開新分頁">
              <ExternalLink size={14} />
            </a>
            <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={download}>
              <Download size={14} /> 下載
            </button>
          </div>
        )}
      </div>

      <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={28} className="animate-spin text-cyan-400" />
            <p className="text-xs">生成中…尖峰時段可能要等 10–40 秒</p>
          </div>
        )}

        {!loading && error && (
          <div className="max-w-sm px-6 text-center">
            <ImageOff size={26} className="mx-auto mb-2 text-rose-400" />
            <p className="text-xs leading-relaxed text-rose-300">{error}</p>
          </div>
        )}

        {!loading && !error && !imageUrl && (
          <div className="max-w-xs px-6 text-center text-slate-600">
            <ImageOff size={26} className="mx-auto mb-2" />
            <p className="text-xs leading-relaxed">
              按下方的「生成圖片」，或直接複製右側的提示詞，拿去你習慣的生圖工具。
            </p>
          </div>
        )}

        {!loading && imageUrl && (
          <>
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                <Loader2 size={24} className="animate-spin text-cyan-400" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="生成結果"
              className="max-h-[70vh] w-auto max-w-full object-contain"
              onLoad={() => setImgLoading(false)}
              onError={() => setImgLoading(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}
