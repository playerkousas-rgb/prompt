// ---------------------------------------------------------------------------
// 外框形狀引擎
//
// 做章最難的一件事就是外框 —— 使用者在腦裡想的形狀，跟工廠能做的、
// 跟生圖 AI 畫得出來的，常常是三回事。所以這裡把形狀變成三樣東西同步輸出：
//   1. 真正畫得出來的 SVG path（對照圖上看得到自己選的外形）
//   2. 一句精準的英文 keywords（餵給生圖 AI）
//   3. 製程旗標 merrowable（能不能包邊）與 note（給工廠的提醒）
//
// 組合章（多片拼成一組）就建立在同一個引擎上：先定母版外框，再用切法切開。
// ---------------------------------------------------------------------------

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShapeDef {
  value: string;
  label: string;
  desc: string;
  keywords: string;
  /** 能不能包邊（Merrow 只能走規則、沒有凹角的外形） */
  merrowable: boolean;
  /** 建議的長寬比（w / h）；對照圖會照這個把母版放進畫布 */
  ratio: number;
  path: (b: Box) => string;
}

// --- 小工具 ----------------------------------------------------------------

const n = (v: number) => Math.round(v * 100) / 100;

/** 依照指定長寬比，把形狀塞進可用區域並置中 */
export function fitBox(area: Box, ratio: number): Box {
  let w = area.w;
  let h = w / ratio;
  if (h > area.h) {
    h = area.h;
    w = h * ratio;
  }
  return { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h };
}

function ellipse(b: Box) {
  const rx = b.w / 2;
  const ry = b.h / 2;
  const cx = b.x + rx;
  const cy = b.y + ry;
  return `M ${n(cx - rx)} ${n(cy)} a ${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0 a ${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0 Z`;
}

function roundRect(b: Box, r: number) {
  const { x, y, w, h } = b;
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M ${n(x + rr)} ${n(y)}`,
    `H ${n(x + w - rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x + w)} ${n(y + rr)}`,
    `V ${n(y + h - rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x + w - rr)} ${n(y + h)}`,
    `H ${n(x + rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x)} ${n(y + h - rr)}`,
    `V ${n(y + rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x + rr)} ${n(y)}`,
    'Z',
  ].join(' ');
}

function polygon(pts: [number, number][]) {
  return pts.map(([px, py], i) => `${i ? 'L' : 'M'} ${n(px)} ${n(py)}`).join(' ') + ' Z';
}

// --- 外框 ------------------------------------------------------------------

export const BADGE_SHAPES: ShapeDef[] = [
  {
    value: 'circle',
    label: '圓形',
    desc: '最安全、最像童軍章。文字可以整圈繞邊',
    keywords: 'a perfectly circular badge',
    merrowable: true,
    ratio: 1,
    path: (b) => ellipse(b),
  },
  {
    value: 'oval',
    label: '橢圓',
    desc: '橫式構圖好放長一點的團名',
    keywords: 'a horizontal oval badge',
    merrowable: true,
    ratio: 1.35,
    path: (b) => ellipse(b),
  },
  {
    value: 'square',
    label: '圓角方形',
    desc: '現代感，適合風景窗與插畫式構圖',
    keywords: 'a square badge with slightly rounded corners',
    merrowable: true,
    ratio: 1,
    path: (b) => roundRect(b, b.w * 0.12),
  },
  {
    value: 'rect',
    label: '長方形 / 旅條',
    desc: '橫長條，團號、旅名、年份一行排完',
    keywords: 'a horizontal rectangular strip badge with rounded corners',
    merrowable: true,
    ratio: 2.6,
    path: (b) => roundRect(b, b.h * 0.22),
  },
  {
    value: 'shield',
    label: '盾形',
    desc: '最正式，像團徽、單位章',
    keywords: 'a classic heraldic shield-shaped badge',
    merrowable: true,
    ratio: 0.86,
    path: (b) => {
      const { x, y, w, h } = b;
      const r = w * 0.1;
      return [
        `M ${n(x + r)} ${n(y)}`,
        `H ${n(x + w - r)}`,
        `A ${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}`,
        `V ${n(y + h * 0.52)}`,
        `C ${n(x + w)} ${n(y + h * 0.82)} ${n(x + w * 0.74)} ${n(y + h * 0.95)} ${n(x + w / 2)} ${n(y + h)}`,
        `C ${n(x + w * 0.26)} ${n(y + h * 0.95)} ${n(x)} ${n(y + h * 0.82)} ${n(x)} ${n(y + h * 0.52)}`,
        `V ${n(y + r)}`,
        `A ${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}`,
        'Z',
      ].join(' ');
    },
  },
  {
    value: 'hex',
    label: '六角形',
    desc: '尖頂六角，技能章常用；包邊做不了',
    keywords: 'a pointed-top hexagonal badge',
    merrowable: false,
    ratio: 0.88,
    path: (b) => {
      const { x, y, w, h } = b;
      return polygon([
        [x + w / 2, y],
        [x + w, y + h * 0.26],
        [x + w, y + h * 0.74],
        [x + w / 2, y + h],
        [x, y + h * 0.74],
        [x, y + h * 0.26],
      ]);
    },
  },
  {
    value: 'diamond',
    label: '菱形',
    desc: '斜放的方形，動感強，但四角容易被洗毛邊',
    keywords: 'a diamond-shaped (rotated square) badge',
    merrowable: false,
    ratio: 1,
    path: (b) => {
      const { x, y, w, h } = b;
      return polygon([
        [x + w / 2, y],
        [x + w, y + h / 2],
        [x + w / 2, y + h],
        [x, y + h / 2],
      ]);
    },
  },
  {
    value: 'flap',
    label: '口袋蓋形（Flap）',
    desc: '美式 OA flap：上方平、下方尖，縫在口袋蓋上',
    keywords: 'a pocket-flap shaped patch, flat top with a pointed bottom, the classic OA lodge flap silhouette',
    merrowable: false,
    ratio: 1.55,
    path: (b) => {
      const { x, y, w, h } = b;
      const r = h * 0.14;
      return [
        `M ${n(x + r)} ${n(y)}`,
        `H ${n(x + w - r)}`,
        `A ${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}`,
        `V ${n(y + h * 0.52)}`,
        `L ${n(x + w / 2)} ${n(y + h)}`,
        `L ${n(x)} ${n(y + h * 0.52)}`,
        `V ${n(y + r)}`,
        `A ${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}`,
        'Z',
      ].join(' ');
    },
  },
  {
    value: 'banner',
    label: '綬帶 / 燕尾旗',
    desc: '下緣燕尾開口，適合純文字的年份條',
    keywords: 'a ribbon banner shaped patch with a swallowtail notch cut into the lower edge',
    merrowable: false,
    ratio: 2.2,
    path: (b) => {
      const { x, y, w, h } = b;
      return polygon([
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x + w * 0.5, y + h * 0.62],
        [x, y + h],
      ]);
    },
  },
  {
    value: 'scallop',
    label: '花邊圓（扇貝邊）',
    desc: '圓周做成一瓣一瓣，復古獎章感；只能雷切',
    keywords: 'a circular badge with a scalloped (shell-edged) rim, vintage award medal feel',
    merrowable: false,
    ratio: 1,
    path: (b) => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const R = Math.min(b.w, b.h) / 2;
      const bumps = 16;
      const inner = R * 0.9;
      const rb = R - inner;
      let d = '';
      for (let i = 0; i < bumps; i++) {
        const a0 = (i / bumps) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / bumps) * Math.PI * 2 - Math.PI / 2;
        const p0 = [cx + inner * Math.cos(a0), cy + inner * Math.sin(a0)];
        const p1 = [cx + inner * Math.cos(a1), cy + inner * Math.sin(a1)];
        if (i === 0) d += `M ${n(p0[0])} ${n(p0[1])} `;
        d += `A ${n(rb * 1.6)} ${n(rb * 1.6)} 0 0 1 ${n(p1[0])} ${n(p1[1])} `;
      }
      return d + 'Z';
    },
  },
  {
    value: 'custom',
    label: '異形（跟著圖走）',
    desc: '外框直接沿著主圖剪 —— 最有辨識度，但一定要雷切，且圖不能有細長突出',
    keywords:
      'a die-cut badge whose outline follows the artwork silhouette exactly, no rectangular field around the art',
    merrowable: false,
    ratio: 1,
    path: (b) => {
      // 一個「看起來像被圖形咬出來的」示意外框
      const { x, y, w, h } = b;
      return [
        `M ${n(x + w * 0.5)} ${n(y)}`,
        `C ${n(x + w * 0.78)} ${n(y + h * 0.02)} ${n(x + w * 0.92)} ${n(y + h * 0.18)} ${n(x + w * 0.88)} ${n(y + h * 0.4)}`,
        `C ${n(x + w * 0.86)} ${n(y + h * 0.56)} ${n(x + w)} ${n(y + h * 0.62)} ${n(x + w * 0.94)} ${n(y + h * 0.78)}`,
        `C ${n(x + w * 0.86)} ${n(y + h * 0.98)} ${n(x + w * 0.6)} ${n(y + h * 0.9)} ${n(x + w * 0.5)} ${n(y + h)}`,
        `C ${n(x + w * 0.4)} ${n(y + h * 0.9)} ${n(x + w * 0.14)} ${n(y + h * 0.98)} ${n(x + w * 0.06)} ${n(y + h * 0.78)}`,
        `C ${n(x)} ${n(y + h * 0.62)} ${n(x + w * 0.14)} ${n(y + h * 0.56)} ${n(x + w * 0.12)} ${n(y + h * 0.4)}`,
        `C ${n(x + w * 0.08)} ${n(y + h * 0.18)} ${n(x + w * 0.22)} ${n(y + h * 0.02)} ${n(x + w * 0.5)} ${n(y)}`,
        'Z',
      ].join(' ');
    },
  },
];

export function shapeById(id: string): ShapeDef {
  return BADGE_SHAPES.find((s) => s.value === id) ?? BADGE_SHAPES[0];
}

// --- 組合章：母版怎麼切 -----------------------------------------------------

export interface SplitDef {
  value: string;
  label: string;
  desc: string;
  /** 可用的片數 */
  counts: number[];
  /** 這種切法做得出來嗎、要注意什麼 */
  note: string;
  /** 寫進提示詞的英文（單片視角） */
  keywords: string;
  /** 母圖視角：整套是怎麼被切開的 */
  assembled: string;
  /** 每一片的描述（給規格單與每片提示詞用） */
  pieceName: (i: number, total: number) => string;
  /** 切割線（畫在母版上），回傳 path 陣列 */
  lines: (b: Box, count: number) => string[];
  /** 是否每片都還是規則外形（還能包邊） */
  piecesRegular: boolean;
}

export const SPLITS: SplitDef[] = [
  {
    value: 'pie',
    label: '切片（像切蛋糕）',
    desc: '母版從圓心切成幾等分，拼起來還原成一整個圓',
    counts: [2, 3, 4, 6],
    note: '每片都是尖角扇形，一定要雷切；尖端最細的地方要留 ≥ 4 mm，不然會翹起來。',
    keywords: 'one piece of a radial pie-cut patch set',
    assembled: 'the circle is divided into equal pie wedges radiating from the centre',
    pieceName: (i, t) => `第 ${i + 1} 片（${t} 等分扇形）`,
    piecesRegular: false,
    lines: (b, count) => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const R = Math.max(b.w, b.h);
      return Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        return `M ${n(cx)} ${n(cy)} L ${n(cx + R * Math.cos(a))} ${n(cy + R * Math.sin(a))}`;
      });
    },
  },
  {
    value: 'grid',
    label: '棋盤格（2×2 / 3×2）',
    desc: '母版切成方格，每片自己也是一張方章',
    counts: [4, 6],
    note: '每片仍是方形，可以包邊 —— 這是最好生產的組合章切法。',
    keywords: 'one tile of a grid-cut patch set',
    assembled: 'the artwork is divided into a grid of equal rectangular tiles',
    pieceName: (i, t) => `第 ${i + 1} 格（共 ${t} 格）`,
    piecesRegular: true,
    lines: (b, count) => {
      const cols = count === 4 ? 2 : 3;
      const rows = Math.ceil(count / cols);
      const out: string[] = [];
      for (let c = 1; c < cols; c++) {
        const x = b.x + (b.w / cols) * c;
        out.push(`M ${n(x)} ${n(b.y)} L ${n(x)} ${n(b.y + b.h)}`);
      }
      for (let r = 1; r < rows; r++) {
        const y = b.y + (b.h / rows) * r;
        out.push(`M ${n(b.x)} ${n(y)} L ${n(b.x + b.w)} ${n(y)}`);
      }
      return out;
    },
  },
  {
    value: 'stripe',
    label: '橫切條',
    desc: '上中下橫切，像把一幅風景切成三條',
    counts: [2, 3, 4],
    note: '每片都是長方形，最好做；地平線、山稜這類橫向構圖最適合。',
    keywords: 'one horizontal band of a sliced panorama patch set',
    assembled: 'the artwork is sliced into equal horizontal bands, like a panorama cut into strips',
    pieceName: (i, t) => `第 ${i + 1} 條（由上往下，共 ${t} 條）`,
    piecesRegular: true,
    lines: (b, count) =>
      Array.from({ length: count - 1 }, (_, i) => {
        const y = b.y + (b.h / count) * (i + 1);
        return `M ${n(b.x)} ${n(y)} L ${n(b.x + b.w)} ${n(y)}`;
      }),
  },
  {
    value: 'ring',
    label: '中心章 + 外圈衛星',
    desc: '中間一片主章，外圈幾片各自獨立 —— 收藏展示最常見的做法',
    counts: [3, 4, 5, 6],
    note: '每片都是完整的小章，可以單獨交換，也不需要精準對齊。風險最低。',
    keywords: 'one satellite patch from a centre-plus-satellites collector set',
    assembled: 'one larger central medallion surrounded by smaller self-contained satellite badges, arranged as a display',
    pieceName: (i, t) => (i === 0 ? '中心主章' : `外圈第 ${i} 片（共 ${t - 1} 片）`),
    piecesRegular: true,
    lines: (b, count) => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const R = Math.min(b.w, b.h) / 2;
      const r = R * 0.34;
      const out = [`M ${n(cx - r)} ${n(cy)} a ${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0 a ${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`];
      const sat = count - 1;
      const sr = R * 0.26;
      for (let i = 0; i < sat; i++) {
        const a = (i / sat) * Math.PI * 2 - Math.PI / 2;
        const px = cx + R * 0.68 * Math.cos(a);
        const py = cy + R * 0.68 * Math.sin(a);
        out.push(`M ${n(px - sr)} ${n(py)} a ${n(sr)} ${n(sr)} 0 1 0 ${n(sr * 2)} 0 a ${n(sr)} ${n(sr)} 0 1 0 ${n(-sr * 2)} 0`);
      }
      return out;
    },
  },
  {
    value: 'jigsaw',
    label: '真·拼圖咬合',
    desc: '每片帶凸榫與凹槽，真的卡得住',
    counts: [2, 3, 4],
    note: '凸榫至少要 8 mm 寬、雷切，而且只能做 PVC 或織章；電繡的榫頭會散開。成本最高。',
    keywords: 'one interlocking jigsaw piece of a multi-part patch set, with a tab and a matching notch',
    assembled: 'the artwork is divided into interlocking jigsaw pieces, each with a chunky rounded tab and a matching notch',
    pieceName: (i, t) => `拼圖第 ${i + 1} 片（共 ${t} 片）`,
    piecesRegular: false,
    lines: (b, count) => {
      // 垂直咬合線：直線中間加一個半圓榫
      const out: string[] = [];
      for (let i = 1; i < count; i++) {
        const x = b.x + (b.w / count) * i;
        const cy = b.y + b.h / 2;
        const t = Math.min(b.w / count, b.h) * 0.16;
        out.push(
          [
            `M ${n(x)} ${n(b.y)}`,
            `L ${n(x)} ${n(cy - t)}`,
            `A ${n(t)} ${n(t)} 0 1 0 ${n(x)} ${n(cy + t)}`,
            `L ${n(x)} ${n(b.y + b.h)}`,
          ].join(' ')
        );
      }
      return out;
    },
  },
];

export function splitById(id: string): SplitDef {
  return SPLITS.find((s) => s.value === id) ?? SPLITS[0];
}
