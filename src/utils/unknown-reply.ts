const UNKNOWN_REPLY_PATTERNS: RegExp[] = [
  /bilgim yok/i,
  /bilgim olmadığını/i,
  /o konuya giremem/i,
  /o konuya giremeyece/i,
  /net bilgim yok/i,
  /bu konuda bilgim/i,
  /elimde (yeterli |net )?bilgi yok/i,
  /bilemiyorum/i,
  /\bi don't know\b/i,
  /\bi do not know\b/i,
  /\bi don't have (that |this |enough )?information\b/i,
  /\bi do not have (that |this |enough )?information\b/i,
];

export function looksLikeUnknownReply(text: string): boolean {
  return UNKNOWN_REPLY_PATTERNS.some((pattern) => pattern.test(text));
}

export function normalizePrompt(text: string): string {
  return text.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').slice(0, 500);
}
