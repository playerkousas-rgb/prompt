// ---------------------------------------------------------------------------
// 讓生圖 AI 看得懂這份 JSON
//
// 這個工具的首要產出就是「生圖 AI 吃得下的 JSON」。實測下來，模型最常犯的三個錯：
//
//   1. 把中文的「描述」當成要印上去的字，直接畫進圖裡
//      （欄位寫「營火與帳篷剪影」，結果章上真的出現這六個字）
//   2. 把平面設計稿畫成「有人戴著它的照片」
//   3. 文字自由發揮：多字、錯字、簡繁混用
//
// 所以每一份章 / 巾圈的 JSON 最前面都掛一組 how_to_read，
// 明確分開「描述用的值」與「要照抄印出來的字」。
// ---------------------------------------------------------------------------

export interface ReadRule {
  text: string;
}

/**
 * @param literalKeys 這份 JSON 裡「要原樣印在成品上」的鍵（其餘一律只是描述）
 * @param kind        成品種類，寫進第 3 條
 */
export function howToRead(literalKeys: string[], kind: string): string[] {
  const list = literalKeys.length ? literalKeys.join('、').replace(/、/g, ', ') : '(none)';
  return [
    'This JSON describes ONE image to generate. Every value is an instruction, not a caption.',
    `Values written in Chinese are descriptions of what to draw — never print those words in the image. The ONLY text that may appear in the image is the string values of: ${list}. Reproduce those character by character, and add no other words, letters or numbers.`,
    `Render the ${kind} itself as the whole image: flat, straight-on, filling the frame on a plain background. No person, no hands, no uniform, no packaging, no mockup perspective.`,
  ];
}

/** 文字排版的硬規則（所有章與巾圈共用） */
export const LETTERING_RULES =
  'Spell every character exactly as given. Traditional Chinese characters must be correctly formed and must not be replaced by simplified forms or by lookalike glyphs. Keep the lettering bold and evenly spaced; never invent extra words.';
