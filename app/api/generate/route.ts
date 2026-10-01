import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * 代理生圖請求。
 *
 * API Key 由瀏覽器在每次請求時帶上，這裡用完即丟 ——
 * 不寫檔、不入庫、不 console.log，也不會出現在任何回應裡。
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  const {
    provider = 'pollinations',
    apiKey = '',
    model = '',
    prompt = '',
    negative = '',
    width = 832,
    height = 1216,
    aspect = '2:3',
    /** 使用者上傳的參考圖（data URL）。只在這一次請求裡用到，不落地。 */
    refImage = null,
  } = body ?? {};

  if (!prompt.trim()) {
    return NextResponse.json({ error: '提示詞是空的' }, { status: 400 });
  }
  if (provider !== 'pollinations' && !apiKey) {
    return NextResponse.json({ error: '這個供應商需要 API Key，請先到右上角「出圖設定」填入' }, { status: 400 });
  }

  try {
    switch (provider) {
      case 'openai':
        return await viaOpenAI({ apiKey, model: model || 'gpt-image-1', prompt, width, height });
      case 'gemini': {
        const m = model || 'gemini-2.5-flash-image';
        // gemini-*-image 系列走 generateContent，可以同時吃文字與參考圖；
        // imagen-* 只吃文字。
        return /image/.test(m) && !m.startsWith('imagen')
          ? await viaGeminiImage({ apiKey, model: m, prompt, refImage })
          : await viaGemini({ apiKey, model: m, prompt, aspect });
      }
      case 'stability':
        return await viaStability({ apiKey, model: model || 'core', prompt, negative, aspect });
      default:
        return await viaPollinations({ model: model || 'flux', prompt, width, height });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || '生圖失敗' }, { status: 502 });
  }
}

// --- Pollinations（免金鑰）-------------------------------------------------

async function viaPollinations(o: { model: string; prompt: string; width: number; height: number }) {
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(o.prompt)}` +
    `?width=${o.width}&height=${o.height}&seed=${seed}&model=${encodeURIComponent(o.model)}&nologo=true&private=true`;
  // 直接回 URL，讓瀏覽器自己抓，避免 serverless 逾時
  return NextResponse.json({ imageUrl: url, provider: 'pollinations', seed });
}

// --- OpenAI ----------------------------------------------------------------

async function viaOpenAI(o: { apiKey: string; model: string; prompt: string; width: number; height: number }) {
  const size =
    o.width === o.height ? '1024x1024' : o.width > o.height ? '1536x1024' : '1024x1536';

  const payload: Record<string, unknown> =
    o.model === 'dall-e-3'
      ? { model: 'dall-e-3', prompt: o.prompt.slice(0, 3900), n: 1, size: size === '1536x1024' ? '1792x1024' : size === '1024x1536' ? '1024x1792' : '1024x1024', quality: 'hd', response_format: 'b64_json' }
      : { model: o.model, prompt: o.prompt.slice(0, 3900), n: 1, size, quality: 'high' };

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${o.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI 回應 ${res.status}`);
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI 沒有回傳圖片');
  return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}`, provider: 'openai' });
}

// --- Google Gemini / Imagen -------------------------------------------------

async function viaGemini(o: { apiKey: string; model: string; prompt: string; aspect: string }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${o.model}:predict`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': o.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: o.prompt }],
        parameters: { sampleCount: 1, aspectRatio: o.aspect === '2:3' ? '3:4' : o.aspect === '3:2' ? '4:3' : '1:1' },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini 回應 ${res.status}`);
  const pred = data?.predictions?.[0];
  const b64 = pred?.bytesBase64Encoded || pred?.image?.imageBytes;
  if (!b64) throw new Error('Gemini 沒有回傳圖片（可能被安全政策擋下）');
  return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}`, provider: 'gemini' });
}

// --- Gemini 2.5 Flash Image（吃參考圖的那一條路）----------------------------

function splitDataUrl(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

async function viaGeminiImage(o: {
  apiKey: string;
  model: string;
  prompt: string;
  refImage: string | null;
}) {
  const parts: any[] = [];

  if (o.refImage) {
    const img = splitDataUrl(o.refImage);
    if (!img) throw new Error('參考圖格式看不懂，請重新選一次照片');
    // 參考圖放在最前面 —— 提示詞裡寫的「第一張圖」指的就是它
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  }
  parts.push({ text: o.prompt });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${o.model}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': o.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini 回應 ${res.status}`);

  const out = data?.candidates?.[0]?.content?.parts ?? [];
  const inline = out.find((p: any) => p.inlineData?.data || p.inline_data?.data);
  const b64 = inline?.inlineData?.data ?? inline?.inline_data?.data;
  if (!b64) {
    const why = out.find((p: any) => p.text)?.text;
    throw new Error(why ? `Gemini 沒有回傳圖片：${why.slice(0, 160)}` : 'Gemini 沒有回傳圖片（可能被安全政策擋下）');
  }
  const mime = inline?.inlineData?.mimeType ?? inline?.inline_data?.mime_type ?? 'image/png';
  return NextResponse.json({ imageUrl: `data:${mime};base64,${b64}`, provider: 'gemini' });
}

// --- Stability AI -----------------------------------------------------------

async function viaStability(o: { apiKey: string; model: string; prompt: string; negative: string; aspect: string }) {
  const form = new FormData();
  form.append('prompt', o.prompt.slice(0, 9900));
  if (o.negative && o.model !== 'ultra') form.append('negative_prompt', o.negative.slice(0, 9900));
  form.append('aspect_ratio', o.aspect === '2:3' ? '2:3' : o.aspect === '3:2' ? '3:2' : '1:1');
  form.append('output_format', 'png');

  const endpoint =
    o.model === 'core'
      ? 'https://api.stability.ai/v2beta/stable-image/generate/core'
      : o.model === 'ultra'
      ? 'https://api.stability.ai/v2beta/stable-image/generate/ultra'
      : 'https://api.stability.ai/v2beta/stable-image/generate/sd3';

  if (o.model.startsWith('sd3')) form.append('model', o.model);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${o.apiKey}`, Accept: 'image/*' },
    body: form,
  });

  if (!res.ok) {
    let msg = `Stability 回應 ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.errors?.join?.(', ') || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return NextResponse.json({ imageUrl: `data:image/png;base64,${buf.toString('base64')}`, provider: 'stability' });
}
