import type { ContactLocale } from '../types/contact';

function normalizeForIntent(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/['’`]/g, '')
    .replace(/[.,!?;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ASK_ADDRESS_ONLY: RegExp[] = [
  /e-?posta(n|sı|si|nız)?(\s+adresi?)?\s*(ne|nedir)\b/,
  /mail(in)?(\s+adresi?)?\s*(ne|nedir)\b/,
  /\bemail address\b/,
  /what(?:'s| is) (?:his |burak'?s )?(?:e-?mail|mail)/,
  /(linkedin|instagram|github).{0,24}(ne|nedir|adresi|hesab[ıi]|link|url)/,
  /(ne|nedir).{0,24}(linkedin|instagram|github)/,
];

const START_CONTACT: RegExp[] = [
  /ulaş(?:mak|abilir|ayım|alım)?/,
  /nasıl ulaş/,
  /ulaşmak istiyorum/,
  /ulaşabilir miyim/,
  /buraka\s+(yaz|ulaş|mail|mesaj|e-?posta)/,
  /ona\s+(yaz|ulaş|mail)/,
  /kendisine\s+(yaz|ulaş)/,
  /\biletişim\b/,
  /iletişime geç/,
  /iletişim kur/,
  /iletişim bilg/,
  /mesaj bırak/,
  /mesaj ilet/,
  /haber bırak/,
  /ona yazmak/,
  /sizinle iletiş/,
  /birlikte çalışmak/,
  /(mail|e-?posta|mesaj)\s*(atmak|göndermek|yazmak|bırakmak)/,
  /(mail|e-?posta|mesaj)\s*(at|gönder|yaz|bırak)\b/,
  /teklif(im)? var/,
  /iş teklifi (bırak|gönder|yaz|ilet)/,
  /freelance.{0,40}(yaz|ulaş|iletişim|contact)/,
  /\bcontact\b/,
  /get in touch/,
  /reach out/,
  /leave a message/,
  /leave him a message/,
  /want to contact/,
  /how (?:can|do) i (?:contact|reach)/,
  /write to (?:him|burak)/,
  /send (?:him )?(?:a )?(?:message|mail|email)/,
];

const CANCEL: RegExp[] = [
  /^(vazgeç|iptal|boşver|iptal et|cancel|never mind|nevermind|forget it|stop)\b/,
];

const CONFIRM_YES: RegExp[] = [
  /^(evet|tamam|olur|olur atalım|isterim|istiyorum|onayla|gönder|ilet|yes|ok|okay|sure|send|confirm)\b/,
];

const ALREADY_WANTS_EMAIL: RegExp[] = [
  /(mail|e-?posta|mesaj)\s*(at|gönder|yaz|bırak|atmak|göndermek)/,
  /leave a message/,
  /send (?:him )?(?:a )?(?:message|mail|email)/,
];

const CONFIRM_NO: RegExp[] = [
  /^(hayır|düzelt|değiştir|yeniden|no|nope|change|edit|retry)\b/,
];

const GREETING_PREFIX = /^(merhaba|selam|selamlar|hello|hi|hey)[!,.\s]*/;

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
  return ASK_ADDRESS_ONLY.some((pattern) => pattern.test(normalizeForIntent(text)));
}

export function isContactIntent(text: string): boolean {
  const normalized = normalizeForIntent(text);
  if (!START_CONTACT.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  if (isAddressQuestion(text) && !/\b(gönder|göndermek|atmak|ulaş|ulaşmak|bırak|bırakmak|ilet|yazmak|contact|reach)\b/.test(normalized)) {
    return false;
  }

  return true;
}

export function isCancelContact(text: string): boolean {
  return CANCEL.some((pattern) => pattern.test(normalizeForIntent(text)));
}

export function isConfirmYes(text: string): boolean {
  return CONFIRM_YES.some((pattern) => pattern.test(normalizeForIntent(text)));
}

export function alreadyWantsEmail(text: string): boolean {
  return ALREADY_WANTS_EMAIL.some((pattern) => pattern.test(normalizeForIntent(text)));
}

export function isConfirmNo(text: string): boolean {
  return CONFIRM_NO.some((pattern) => pattern.test(normalizeForIntent(text)));
}

const NAME_STOP_WORDS = new Set([
  'want',
  'to',
  'the',
  'him',
  'burak',
  'please',
  'i',
  'ı',
  'a',
  'for',
  'icin',
  'için',
]);

export function looksLikeName(text: string): boolean {
  const words = normalizeForIntent(text).split(' ').filter(Boolean);
  return (
    words.length >= 2 &&
    words.length <= 4 &&
    words.every((word) => /^[\p{L}.'-]+$/u.test(word) && !NAME_STOP_WORDS.has(word))
  );
}

export function stripContactIntentPhrases(message: string): string {
  return normalizeForIntent(message)
    .replace(GREETING_PREFIX, '')
    .replace(/buraka\s+/g, ' ')
    .replace(/nasıl ulaşabilirim/g, ' ')
    .replace(/nasıl ulaş/g, ' ')
    .replace(/ulaşmak istiyorum/g, ' ')
    .replace(/ulaşabilir miyim/g, ' ')
    .replace(/ulaş(?:mak|abilir|ayım|alım)?/g, ' ')
    .replace(/\b(istiyorum|isterim|lütfen|please)\b/g, ' ')
    .replace(/iletişime geçmek istiyorum/g, ' ')
    .replace(/iletişim bilgileri(niz)?/g, ' ')
    .replace(/\biletişim\b/g, ' ')
    .replace(/birlikte çalışmak için/g, ' ')
    .replace(/mesaj bırakmak istiyorum/g, ' ')
    .replace(/(mail|e-?posta|mesaj)\s*(atmak|göndermek|yazmak|bırakmak)/g, ' ')
    .replace(/(mail|e-?posta|mesaj)\s*(at|gönder|yaz|bırak)\b/g, ' ')
    .replace(/\bcontact\b/g, ' ')
    .replace(/get in touch/g, ' ')
    .replace(/how (?:can|do) i (?:contact|reach)(?: him| burak)?/g, ' ')
    .replace(/i want to contact(?: him| burak)?/g, ' ')
    .replace(/leave a message/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
