// ---------------------------------------------------------------------------
// 生圖供應商
//
// 安全原則：API Key 只存在使用者瀏覽器的 localStorage，
// 每次出圖時隨 request 送到我們的 route handler、用完即丟，
// 伺服器不寫檔、不記 log、不進資料庫、更不會進 git。
// ---------------------------------------------------------------------------

export type ProviderId = 'pollinations' | 'openai' | 'gemini' | 'stability';

export interface ProviderDef {
  id: ProviderId;
  label: string;
  /** 不用 key 就能跑？ */
  free: boolean;
  desc: string;
  keyHint: string;
  keyUrl?: string;
  models: { value: string; label: string }[];
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'pollinations',
    label: 'Pollinations（免金鑰）',
    free: true,
    desc: '零門檻，不用註冊就能出圖。品質中上、尖峰時段會慢，適合先試構圖。',
    keyHint: '不需要 API Key',
    models: [
      { value: 'flux', label: 'FLUX' },
      { value: 'turbo', label: 'Turbo（快）' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    free: false,
    desc: '對「卡面文字」的處理目前最穩，想生整張含字的卡優先選它。',
    keyHint: 'sk-... （Platform API Key）',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { value: 'gpt-image-1', label: 'gpt-image-1' },
      { value: 'dall-e-3', label: 'DALL·E 3' },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini / Imagen',
    free: false,
    desc: '人物與動漫畫風表現強，速度快，免費額度相對寬鬆。',
    keyHint: 'AIza... （Google AI Studio Key）',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: [
      { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image（可讀參考圖）' },
      { value: 'imagen-4.0-generate-001', label: 'Imagen 4' },
      { value: 'imagen-3.0-generate-002', label: 'Imagen 3' },
    ],
  },
  {
    id: 'stability',
    label: 'Stability AI',
    free: false,
    desc: '支援負面提示詞與長寬比精細控制，想精調構圖時好用。',
    keyHint: 'sk-... （Stability API Key）',
    keyUrl: 'https://platform.stability.ai/account/keys',
    models: [
      { value: 'core', label: 'Stable Image Core' },
      { value: 'ultra', label: 'Stable Image Ultra' },
      { value: 'sd3.5-large', label: 'SD 3.5 Large' },
    ],
  },
];

/**
 * 這個供應商 / 模型能不能「看著你上傳的照片」出圖（圖生圖）。
 * 目前只有 Gemini 的 image 系列可以；其他家一律只吃文字。
 */
export function providerTakesReference(providerId: string, model: string) {
  return providerId === 'gemini' && /image/.test(model) && !model.startsWith('imagen');
}

export function getProvider(id: string) {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export const ASPECTS = [
  { value: 'portrait', label: '直式 2:3（整張卡）', w: 832, h: 1216, ar: '2:3' },
  { value: 'square', label: '正方 1:1（遊戲王插圖窗）', w: 1024, h: 1024, ar: '1:1' },
  { value: 'landscape', label: '橫式 3:2（宣傳圖）', w: 1216, h: 832, ar: '3:2' },
];
