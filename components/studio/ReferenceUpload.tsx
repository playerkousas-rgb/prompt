'use client';

import React, { useRef } from 'react';
import { ImageUp, X, ShieldCheck } from 'lucide-react';

/**
 * 參考圖上傳 —— 「把我自己 / 我家的貓變成一張卡」。
 *
 * 圖片只活在這個分頁的記憶體裡：不寫 localStorage、不上傳我們的伺服器，
 * 只有在你按「生成圖片」而且供應商吃圖的時候，才隨那一次請求送出去。
 */
export function ReferenceUpload({
  image,
  onImage,
  kind,
}: {
  image: string | null;
  onImage: (dataUrl: string | null) => void;
  kind: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const label =
    kind === 'pet' ? '寵物照片' : kind === 'person' ? '人物照片' : kind === 'object' ? '物件 / 風景照' : '參考圖';

  return (
    <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-3">
      <div className="flex items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt="參考圖"
            className="h-16 w-16 shrink-0 rounded-lg border border-slate-700 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-600 text-slate-600">
            <ImageUp size={20} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-200">{label}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
            {image
              ? '已選好。複製提示詞到別的 AI 時，記得把這張圖當成第一張一起上傳。'
              : '選一張清楚、正面、光線足夠的照片，效果最好。'}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <button className="btn-ghost !px-2.5 !py-1 text-[11px]" onClick={() => fileRef.current?.click()}>
              <ImageUp size={12} /> {image ? '換一張' : '選擇照片'}
            </button>
            {image && (
              <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => onImage(null)}>
                <X size={12} /> 移除
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-snug text-slate-500">
        <ShieldCheck size={11} className="mt-0.5 shrink-0 text-emerald-400" />
        圖片只留在這個瀏覽器分頁，關掉就沒了；只有按下「生成圖片」時才會隨那一次請求送給你選的供應商。
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const fr = new FileReader();
          fr.onload = () => onImage(fr.result as string);
          fr.readAsDataURL(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
