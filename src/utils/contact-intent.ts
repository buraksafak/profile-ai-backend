import type { ContactLocale } from '../types/contact';

const ASK_ADDRESS_ONLY: RegExp[] = [
  /e-?posta(n|sı|si|nız)?(\s+adresi?)?\s*(ne|nedir)/i,
  /mail(in)?(\s+adresi?)?\s*(ne|nedir)/i,
  /\bemail address\b/i,
  /what(?:'s| is) (?:his |burak'?s )?(?:e-?mail|mail)/i,
  /\blinkedin\b/i,
  /\binstagram\b/i,
  /\bgithub\b/i,
];

const START_CONTACT: RegExp[] = [
  /ulaşmak istiyorum/i,
  /nasıl ulaş/i,
  /ulaşabilir miyim/i,
  /iletişime geç/i,
  /iletişim kur/i,
  /iletişim bilg/i,
  /mesaj bırak/i,
  /mesaj ilet/i,
  /haber bırak/i,
  /ona yazmak/i,
  /sizinle iletiş/i,
  /(mail|e-?posta)\s*(atmak|göndermek|yazmak|bırakmak)/i,
  /(mail|e-?posta)\s+(at|gönder|yaz|bırak)\b/i,
  /teklif(im)? var/i,
  /iş teklifi (bırak|gönder|yaz|ilet)/i,
  /freelance.{0,40}(yaz|ulaş|iletişim|contact)/i,
  /get in touch/i,
  /reach out/i,
  /leave a message/i,
  /leave him a message/i,
  /want to contact/i,
  /how (?:can|do) i contact/i,
  /contact (?:him|burak|you)/i,
  /write to (?:him|burak)/i,
  /send (?:him )?(?:a )?message/i,
];

const CANCEL: RegExp[] = [
  /^(vazgeç|iptal|boşver|iptal et|cancel|never mind|nevermind|forget it|stop)\b/i,
];

const CONFIRM_YES: RegExp[] = [
  /^(evet|tamam|olur|onayla|gönder|ilet|yes|ok|okay|sure|send|confirm)\b/i,
];

const CONFIRM_NO: RegExp[] = [
  /^(hayır|düzelt|değiştir|yeniden|no|nope|change|edit|retry)\b/i,
];

const GREETING_PREFIX = /^(merhaba|selam|selamlar|hello|hi|hey)[!,.\s]*/i;

export function detectLocale(text: string): ContactLocale {
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) {
    return 'tr';
  }

  if (
    /\b(the|you|your|please|hello|hi|want|contact|message|reach|leave|write)\b/i.test(text) &&
    !/\b(istiyorum|ulaş|mesaj|başlık|konu|iletişim)\b/i.test(text)
  ) {
    return 'en';
  }

  return 'tr';
}

export function isAddressQuestion(text: string): boolean {
  return ASK_ADDRESS_ONLY.some((pattern) => pattern.test(text));
}

export function isContactIntent(text: string): boolean {
  if (isAddressQuestion(text)) {
    return false;
  }

  return START_CONTACT.some((pattern) => pattern.test(text));
}

export function isCancelContact(text: string): boolean {
  return CANCEL.some((pattern) => pattern.test(text.trim()));
}

export function isConfirmYes(text: string): boolean {
  return CONFIRM_YES.some((pattern) => pattern.test(text.trim()));
}

export function isConfirmNo(text: string): boolean {
  return CONFIRM_NO.some((pattern) => pattern.test(text.trim()));
}

export function stripContactIntentPhrases(message: string): string {
  return message
    .replace(GREETING_PREFIX, '')
    .replace(/burak'?a\s+/gi, ' ')
    .replace(/nasıl ulaşabilirim/gi, ' ')
    .replace(/ulaşmak istiyorum/gi, ' ')
    .replace(/ulaşabilir miyim/gi, ' ')
    .replace(/iletişime geçmek istiyorum/gi, ' ')
    .replace(/iletişim bilgileri(niz)?/gi, ' ')
    .replace(/mesaj bırakmak istiyorum/gi, ' ')
    .replace(/get in touch/gi, ' ')
    .replace(/how (?:can|do) i contact(?: him| burak)?/gi, ' ')
    .replace(/i want to contact(?: him| burak)?/gi, ' ')
    .replace(/leave a message/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
