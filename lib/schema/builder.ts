import type { FieldDef, FillMode, JsonLine, PromptSegment } from './types';

/**
 * 把「欄位 → prompt 片段」的對應關係包起來。
 * 每一段文字都記得自己是哪個欄位生出來的，前端才能做雙向高亮。
 */
export class PromptWriter {
  segments: PromptSegment[] = [];

  /** 固定文字（接著詞、骨架），不屬於任何欄位 */
  lit(text: string) {
    if (!text) return this;
    this.segments.push({ text });
    return this;
  }

  /** 來自某個欄位的文字 */
  field(fieldId: string, text: string, ai = false) {
    if (!text) return this;
    this.segments.push({ text, fieldId, ai });
    return this;
  }

  get text() {
    return this.segments.map((s) => s.text).join('');
  }
}

export interface Resolved {
  /** 要寫進 prompt 的值（locked = 用戶的值；ai = 給 AI 的指示） */
  value: string;
  ai: boolean;
  /** 用戶原始輸入，不管模式 */
  raw: string;
}

export function makeResolver(
  fields: FieldDef[],
  values: Record<string, string>,
  modes: Record<string, FillMode>
) {
  const byId = new Map(fields.map((f) => [f.id, f]));

  return function r(id: string): Resolved {
    const f = byId.get(id);
    const raw = (values[id] ?? '').trim();
    const mode = modes[id] ?? 'locked';
    if (f && f.aiFillable && mode === 'ai') {
      return { value: f.aiInstruction || `(let the AI invent a fitting ${f.label})`, ai: true, raw };
    }
    return { value: raw, ai: false, raw };
  };
}

/** 從 select/chips 的選項撈出對應的英文關鍵字 */
export function keywordsOf(fields: FieldDef[], id: string, value: string): string {
  const f = fields.find((x) => x.id === id);
  if (!f) return value;
  if (f.control.kind !== 'select' && f.control.kind !== 'chips') return value;
  const opt = f.control.options.find((o) => o.value === value);
  return opt?.keywords || opt?.label || value;
}

/** 輔助：產生帶欄位標記的 JSON 行 */
export class JsonWriter {
  lines: JsonLine[] = [];
  private depth = 0;

  open(key: string | null, brace: '{' | '[' = '{') {
    this.lines.push({ text: `${this.pad()}${key ? `"${key}": ` : ''}${brace}` });
    this.depth++;
    return this;
  }

  close(brace: '}' | ']' = '}', comma = true) {
    this.depth--;
    this.lines.push({ text: `${this.pad()}${brace}${comma ? ',' : ''}` });
    return this;
  }

  kv(key: string, value: string, fieldId?: string, ai = false, comma = true) {
    if (value === '' || value == null) return this;
    const safe = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    this.lines.push({ text: `${this.pad()}"${key}": "${safe}"${comma ? ',' : ''}`, fieldId, ai });
    return this;
  }

  /** 一定會輸出，即使值是空字串（經典格式需要保留空欄位） */
  kvForce(key: string, value: string, fieldId?: string, ai = false, comma = true) {
    const safe = String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    this.lines.push({ text: `${this.pad()}"${key}": "${safe}"${comma ? ',' : ''}`, fieldId, ai });
    return this;
  }

  raw(key: string, value: string, comma = true) {
    this.lines.push({ text: `${this.pad()}"${key}": ${value}${comma ? ',' : ''}` });
    return this;
  }

  /** 字串陣列，每個元素可以掛自己的來源欄位 */
  arr(key: string, items: { text: string; fieldId?: string; ai?: boolean }[]) {
    this.lines.push({ text: `${this.pad()}"${key}": [` });
    this.depth++;
    items.forEach((it, i) => {
      const safe = it.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      this.lines.push({
        text: `${this.pad()}"${safe}"${i < items.length - 1 ? ',' : ''}`,
        fieldId: it.fieldId,
        ai: it.ai,
      });
    });
    this.depth--;
    this.lines.push({ text: `${this.pad()}],` });
    return this;
  }

  private pad() {
    return '  '.repeat(this.depth);
  }

  /** 清掉每個區塊最後一個多餘的逗號 */
  finish(): JsonLine[] {
    const out = this.lines;
    for (let i = 0; i < out.length; i++) {
      const next = out[i + 1];
      const t = out[i].text;
      if (!t.endsWith(',')) continue;
      const nt = next?.text.trim() ?? '';
      if (!next || nt.startsWith('}') || nt.startsWith(']')) {
        out[i] = { ...out[i], text: t.slice(0, -1) };
      }
    }
    return out;
  }
}

export const BASE_NEGATIVE =
  'text artifacts, gibberish letters, watermark, signature, logo, blurry, lowres, jpeg artifacts, extra fingers, deformed hands, bad anatomy, cropped, out of frame, duplicate character, flat lighting, muddy colors';
