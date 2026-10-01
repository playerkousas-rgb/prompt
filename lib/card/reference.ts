// ---------------------------------------------------------------------------
// 參考圖（附圖）—— 「把我自己 / 我家的狗變成一張卡」的那條路。
//
// 三套系統共用這組欄位，由 referenceFields() 注入。
// 真正的圖片檔只存在瀏覽器（state / 送去出圖時才帶上），不會進 localStorage、
// 也不會寫進任何檔案。這裡只負責產生「請模型看第一張圖」的文字指示。
// ---------------------------------------------------------------------------

import type { FieldDef } from './types';

export const REF_PHOTO_SENTENCE = 'Please refer to the first image I uploaded.';

export type RefUse = 'none' | 'person' | 'pet' | 'object';

export const REF_USE_OPTIONS = [
  {
    value: 'none',
    label: '不附圖（純文字描述）',
    desc: '完全照你填的文字生成，不需要上傳任何東西。',
  },
  {
    value: 'person',
    label: '附一張人物照片',
    desc: '把自己 / 朋友 / 小孩畫成卡牌角色，長相要認得出來。',
  },
  {
    value: 'pet',
    label: '附一張寵物照片',
    desc: '把貓狗等寵物畫成卡牌生物，花色與品種特徵要保留。',
  },
  {
    value: 'object',
    label: '附一張物件 / 風景照',
    desc: '參考某個物品、場地或既有卡圖的構圖與氛圍。',
  },
];

/** 不同主體要「鎖住」的東西不一樣 —— 人看臉，寵物看花色 */
const IDENTITY_LOCK: Record<Exclude<RefUse, 'none'>, string> = {
  person:
    'The first uploaded image is the identity reference for the main character. Keep the same face shape, eye shape, eyebrows, nose, mouth, skin tone, hairstyle and hair colour so the person stays clearly recognisable. Redraw them in the card illustration style — do not paste the photo in.',
  pet:
    'The first uploaded image is the identity reference for the animal. Keep the same breed, body proportions, fur or feather colour, markings, patch placement, eye colour and ear shape so the owner can recognise their own pet at a glance. Redraw it in the card illustration style — do not paste the photo in.',
  object:
    'The first uploaded image is a visual reference for the object / location shown. Match its shape, colour and material, but recompose it to fit the card artwork.',
};

const STRICTNESS: Record<string, string> = {
  stylised:
    'Fully restyle into the card art style while keeping the identity features above intact.',
  faithful:
    'Stay close to the reference: same proportions and details, only lighting and rendering are upgraded to card art quality.',
  loose:
    'Use the reference only as loose inspiration for mood, colour and silhouette.',
};

export function referenceFields(): FieldDef[] {
  return [
    {
      id: 'ref_use',
      label: '要不要附參考圖',
      group: 'subject',
      impact: 'high',
      hint: '想把自己或寵物變成卡牌，就選對應的那一項 —— 提示詞會自動加上「請參考我上傳的第一張圖」的鎖定指示。',
      control: { kind: 'select', options: REF_USE_OPTIONS },
      aiFillable: false,
      default: 'none',
      essential: true,
      outputKey: 'reference_image',
    },
    {
      id: 'ref_keep',
      label: '一定要保留的特徵',
      group: 'subject',
      impact: 'mid',
      hint: '照片裡最不能被改掉的東西，例如：圓框眼鏡、左耳缺一角、胸口白色愛心斑。',
      control: {
        kind: 'text',
        placeholder: '例如：橘白虎斑、鼻頭一塊黑、左耳摺耳',
      },
      aiFillable: false,
      default: '',
      essential: true,
      outputKey: 'reference_image.must_keep',
    },
    {
      id: 'ref_strength',
      label: '要多像照片',
      group: 'subject',
      impact: 'mid',
      hint: '「風格化」最像卡牌、「忠實」最像本人，拿不定主意就用風格化。',
      control: {
        kind: 'select',
        options: [
          { value: 'stylised', label: '風格化（像卡牌，但認得出來）' },
          { value: 'faithful', label: '忠實（盡量貼近照片）' },
          { value: 'loose', label: '鬆散（只抓氣氛）' },
        ],
      },
      aiFillable: false,
      default: 'stylised',
      outputKey: 'reference_image.fidelity',
    },
  ];
}

export function hasReference(values: Record<string, string>) {
  const v = (values.ref_use || 'none') as RefUse;
  return v !== 'none';
}

export interface RefLines {
  /** subject 那一行要怎麼寫 */
  subjectSuffix: string;
  /** character_details.clothing 要不要改成「看第一張圖」 */
  usePhotoForLooks: boolean;
  /** hair 只有人物照才有意義（寵物沒有髮型） */
  usePhotoForHair: boolean;
  /** reference_image 區塊的內容（沒附圖就是 null） */
  block: { usage: string; must_keep: string; fidelity: string; do_not: string } | null;
}

export function referenceLines(values: Record<string, string>): RefLines {
  const use = (values.ref_use || 'none') as RefUse;
  if (use === 'none') {
    return { subjectSuffix: '', usePhotoForLooks: false, usePhotoForHair: false, block: null };
  }

  const keep = (values.ref_keep || '').trim();
  const fidelity = STRICTNESS[values.ref_strength || 'stylised'] ?? STRICTNESS.stylised;

  return {
    subjectSuffix: ' based on the first uploaded reference photo',
    usePhotoForLooks: use === 'person' || use === 'pet',
    usePhotoForHair: use === 'person',
    block: {
      usage: IDENTITY_LOCK[use],
      must_keep: keep
        ? `Must keep these details from the photo: ${keep}`
        : use === 'pet'
        ? 'Must keep the exact fur colour and marking placement from the photo.'
        : 'Must keep the facial features from the photo.',
      fidelity,
      do_not:
        'Do not output a photo collage, do not leave the original photo background, do not change the species / gender / age of the subject.',
    },
  };
}
