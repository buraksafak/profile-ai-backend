import { z } from 'zod';
import { contactRepository } from '../repositories/contact.repository';
import { logger } from '../utils/logger';
import {
  detectLocale,
  isCancelContact,
  isConfirmNo,
  isConfirmYes,
  isContactIntent,
  stripContactIntentPhrases,
} from '../utils/contact-intent';
import { neutralizeDelimiters } from '../utils/prompt-guard';
import type {
  ContactDraft,
  ContactHandleInput,
  ContactHandleResult,
  ContactLocale,
  ContactStep,
} from '../types/contact';
import { mailService } from './mail.service';

const SESSION_TTL_MS = 30 * 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;

const nameSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine((value) => /[\p{L}]/u.test(value), 'name must include a letter');

const emailSchema = z.string().trim().email().max(160);

const subjectSchema = z.string().trim().min(3).max(120);

const bodySchema = z.string().trim().min(8).max(1000);

interface ContactSession {
  step: ContactStep;
  draft: ContactDraft;
  locale: ContactLocale;
  ipAddress: string | null;
  userAgent: string | null;
  updatedAt: number;
}

interface SendWindow {
  count: number;
  startedAt: number;
}

const COPY = {
  tr: {
    askName: 'Tabii, mesajını Burak’a ileteyim. Adın ve soyadın nedir?',
    askEmail: 'Dönüş için e-posta adresin nedir?',
    askSubject: 'Kısa bir başlık yazar mısın? Örneğin iş teklifi, freelance proje veya soru.',
    askBody: 'Konuyu biraz açar mısın? Ne üzerine yazmak istiyorsun?',
    invalidName: 'Adı soyadı biraz daha net yazar mısın?',
    invalidEmail: 'Geçerli bir e-posta adresi yazar mısın? Burak böylece sana dönüş yapabilir.',
    invalidSubject: 'Başlık çok kısa kaldı. Birkaç kelimeyle yazar mısın?',
    invalidBody: 'Konuyu biraz daha açar mısın? En az birkaç cümle yeterli.',
    confirm: (draft: Required<ContactDraft>) =>
      [
        'Şunu ileteceğim:',
        `Ad: ${draft.name}`,
        `E-posta: ${draft.email}`,
        `Başlık: ${draft.subject}`,
        `Konu: ${draft.body}`,
        'Göndereyim mi? Evet dersen iletirim, hayır dersen baştan alırız. Vazgeç dersen iptal ederim.',
      ].join('\n'),
    sent: 'İlettim. Burak genelde 1–2 iş günü içinde dönüş yapar.',
    saved: 'Mesajını kaydettim. Burak onu görecek ve 1–2 iş günü içinde dönüş yapacak.',
    failed: 'Şu an iletemedim. LinkedIn üzerinden de yazabilirsin: https://www.linkedin.com/in/buraksafak/',
    cancelled: 'Tamam, vazgeçtim. Başka bir şey sormak istersen buradayım.',
    restart: 'Tamam, baştan alalım. Adın ve soyadın nedir?',
    rateLimited: 'Kısa sürede fazla mesaj denendi. Biraz sonra tekrar dener misin?',
    confirmHint: 'Göndermek için evet, düzeltmek için hayır, vazgeçmek için vazgeç yazman yeterli.',
  },
  en: {
    askName: 'Sure, I can pass your note to Burak. What is your full name?',
    askEmail: 'What email should he use to reply?',
    askSubject: 'Please share a short title. For example job offer, freelance project, or a question.',
    askBody: 'Tell me a bit more. What would you like to write about?',
    invalidName: 'Please write your name a little more clearly.',
    invalidEmail: 'Please share a valid email so Burak can reply.',
    invalidSubject: 'That title is too short. A few words are enough.',
    invalidBody: 'Please add a bit more detail. A few sentences are enough.',
    confirm: (draft: Required<ContactDraft>) =>
      [
        'I will send this:',
        `Name: ${draft.name}`,
        `Email: ${draft.email}`,
        `Title: ${draft.subject}`,
        `Message: ${draft.body}`,
        'Should I send it? Say yes to send, no to start over, or cancel to stop.',
      ].join('\n'),
    sent: 'Sent. Burak usually replies in 1–2 business days.',
    saved: 'I saved your message. Burak will see it and usually replies in 1–2 business days.',
    failed:
      'I could not send it right now. You can also reach him on LinkedIn: https://www.linkedin.com/in/buraksafak/',
    cancelled: 'Okay, I cancelled it. Ask me anything else if you want.',
    restart: 'Okay, let’s start over. What is your full name?',
    rateLimited: 'Too many messages in a short time. Please try again later.',
    confirmHint: 'Say yes to send, no to start over, or cancel to stop.',
  },
} as const;

export class ContactService {
  private readonly sessions = new Map<string, ContactSession>();
  private readonly sendWindows = new Map<string, SendWindow>();

  async handle(input: ContactHandleInput): Promise<ContactHandleResult> {
    const message = neutralizeDelimiters(input.message).trim();
    if (!message) {
      return { handled: false };
    }

    const key = this.sessionKey(input);
    this.pruneExpired();

    const existing = this.sessions.get(key);
    if (existing) {
      return this.continueSession(key, existing, message);
    }

    if (!isContactIntent(message)) {
      return { handled: false };
    }

    const locale = detectLocale(message);
    const leftover = stripContactIntentPhrases(message);
    const session: ContactSession = {
      step: 'name',
      draft: {},
      locale,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      updatedAt: Date.now(),
    };
    this.sessions.set(key, session);

    if (leftover.length >= 2 && leftover !== message) {
      return this.continueSession(key, session, leftover);
    }

    return { handled: true, reply: COPY[locale].askName, submitted: false };
  }

  private async continueSession(
    key: string,
    session: ContactSession,
    message: string,
  ): Promise<ContactHandleResult> {
    const copy = COPY[session.locale];
    session.updatedAt = Date.now();

    if (isCancelContact(message)) {
      this.sessions.delete(key);
      return { handled: true, reply: copy.cancelled, submitted: false };
    }

    if (session.step === 'confirm') {
      return this.handleConfirm(key, session, message);
    }

    if (session.step === 'name') {
      const parsed = nameSchema.safeParse(message);
      if (!parsed.success) {
        return { handled: true, reply: copy.invalidName, submitted: false };
      }
      session.draft.name = parsed.data;
      session.step = 'email';
      return { handled: true, reply: copy.askEmail, submitted: false };
    }

    if (session.step === 'email') {
      const parsed = emailSchema.safeParse(message);
      if (!parsed.success) {
        return { handled: true, reply: copy.invalidEmail, submitted: false };
      }
      session.draft.email = parsed.data.toLowerCase();
      session.step = 'subject';
      return { handled: true, reply: copy.askSubject, submitted: false };
    }

    if (session.step === 'subject') {
      const parsed = subjectSchema.safeParse(message);
      if (!parsed.success) {
        return { handled: true, reply: copy.invalidSubject, submitted: false };
      }
      session.draft.subject = parsed.data;
      session.step = 'body';
      return { handled: true, reply: copy.askBody, submitted: false };
    }

    const parsed = bodySchema.safeParse(message);
    if (!parsed.success) {
      return { handled: true, reply: copy.invalidBody, submitted: false };
    }
    session.draft.body = parsed.data;
    session.step = 'confirm';

    const draft = this.requireDraft(session.draft);
    return { handled: true, reply: copy.confirm(draft), submitted: false };
  }

  private async handleConfirm(
    key: string,
    session: ContactSession,
    message: string,
  ): Promise<ContactHandleResult> {
    const copy = COPY[session.locale];

    if (isConfirmNo(message)) {
      session.step = 'name';
      session.draft = {};
      return { handled: true, reply: copy.restart, submitted: false };
    }

    if (!isConfirmYes(message)) {
      return { handled: true, reply: copy.confirmHint, submitted: false };
    }

    if (!this.canSend(key)) {
      this.sessions.delete(key);
      return { handled: true, reply: copy.rateLimited, submitted: false };
    }

    const draft = this.requireDraft(session.draft);
    this.sessions.delete(key);

    try {
      const saved = await contactRepository.create({
        ...draft,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      });

      const mail = await mailService.sendContactMessage(draft);
      if (mail.sent) {
        await contactRepository.markEmailSent(saved.id);
        this.recordSend(key);
        return { handled: true, reply: copy.sent, submitted: true };
      }

      this.recordSend(key);
      logger.warn({ contactId: saved.id, error: mail.error }, 'Contact saved without email');
      return { handled: true, reply: copy.saved, submitted: true };
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to persist contact message');
      return { handled: true, reply: copy.failed, submitted: false };
    }
  }

  private requireDraft(draft: ContactDraft): Required<ContactDraft> {
    if (!draft.name || !draft.email || !draft.subject || !draft.body) {
      throw new Error('Incomplete contact draft');
    }

    return {
      name: draft.name,
      email: draft.email,
      subject: draft.subject,
      body: draft.body,
    };
  }

  private sessionKey(input: ContactHandleInput): string {
    if (input.sessionId?.trim()) {
      return `sid:${input.sessionId.trim()}`;
    }

    return `ip:${input.ipAddress ?? 'unknown'}|${(input.userAgent ?? '').slice(0, 80)}`;
  }

  private canSend(key: string): boolean {
    const window = this.sendWindows.get(key);
    if (!window || Date.now() - window.startedAt > SEND_WINDOW_MS) {
      return true;
    }

    return window.count < MAX_SENDS_PER_WINDOW;
  }

  private recordSend(key: string): void {
    const now = Date.now();
    const window = this.sendWindows.get(key);
    if (!window || now - window.startedAt > SEND_WINDOW_MS) {
      this.sendWindows.set(key, { count: 1, startedAt: now });
      return;
    }

    window.count += 1;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(key);
      }
    }

    for (const [key, window] of this.sendWindows) {
      if (now - window.startedAt > SEND_WINDOW_MS) {
        this.sendWindows.delete(key);
      }
    }
  }
}

export const contactService = new ContactService();
