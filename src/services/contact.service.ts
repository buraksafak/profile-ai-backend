import { z } from 'zod';
import { contactRepository } from '../repositories/contact.repository';
import { logger } from '../utils/logger';
import {
  alreadyWantsEmail,
  detectLocale,
  isCancelContact,
  isConfirmNo,
  isConfirmYes,
  isContactIntent,
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
const SEND_COOLDOWN_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SENDS_PER_IP_DAY = 3;
const MAX_SENDS_PER_EMAIL_DAY = 2;
const MAX_SENDS_GLOBAL_DAY = 20;

type RateLimitReason = 'cooldown' | 'ip' | 'email' | 'global';

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

const COPY = {
  tr: {
    askConsent: 'Burak’a sohbetten mail bırakabilirsin. Mail atmak ister misin?',
    consentHint: 'Mail atmak için evet, vazgeçmek için hayır yazman yeterli.',
    askName: 'Tamam. Adın ve soyadın nedir?',
    askEmail: 'Tamam. Dönüş için e-posta adresin nedir?',
    askSubject: 'Tamam. Kısa bir başlık yazar mısın? Örneğin iş teklifi, freelance proje veya soru.',
    askBody: 'Tamam. Konuyu biraz açar mısın?',
    invalidName: 'Adı soyadı biraz daha net yazar mısın?',
    invalidEmail: 'Geçerli bir e-posta adresi yazar mısın? Burak böylece sana dönüş yapabilir.',
    invalidSubject: 'Başlık çok kısa kaldı. Birkaç kelimeyle yazar mısın?',
    invalidBody: 'Konuyu biraz daha açar mısın? En az birkaç cümle yeterli.',
    sent: 'Mailini ilettim. Burak genelde 1–2 iş günü içinde dönüş yapar.',
    notConfigured: 'Mail servisi şu an tanımlı değil. LinkedIn üzerinden yazabilirsin: https://www.linkedin.com/in/buraksafak/',
    failed: 'Maili şu an gönderemedim. LinkedIn üzerinden de yazabilirsin: https://www.linkedin.com/in/buraksafak/',
    cancelled: 'Tamam, mail bırakmadım. Başka bir şey sormak istersen buradayım.',
    rateLimitedCooldown: 'Az önce bir mesaj ilettim. Yenisini 15 dakika sonra bırakabilirsin.',
    rateLimitedIp: 'Bu cihazdan bugünlük mesaj sınırına ulaşıldı. Yarın tekrar dener misin?',
    rateLimitedEmail: 'Bu e-posta ile bugün zaten mesaj bırakıldı. Yarın tekrar dener misin?',
    rateLimitedGlobal: 'Bugün çok fazla mesaj geldi. Lütfen yarın tekrar dene.',
  },
  en: {
    askConsent: 'You can leave Burak an email from this chat. Would you like to send one?',
    consentHint: 'Say yes to send an email, or no to cancel.',
    askName: 'Okay. What is your full name?',
    askEmail: 'Okay. What email should he use to reply?',
    askSubject: 'Okay. Please share a short title. For example job offer, freelance project, or a question.',
    askBody: 'Okay. Tell me a bit more about the topic.',
    invalidName: 'Please write your name a little more clearly.',
    invalidEmail: 'Please share a valid email so Burak can reply.',
    invalidSubject: 'That title is too short. A few words are enough.',
    invalidBody: 'Please add a bit more detail. A few sentences are enough.',
    sent: 'I sent your email. Burak usually replies in 1–2 business days.',
    notConfigured: 'Email is not configured right now. You can also write on LinkedIn: https://www.linkedin.com/in/buraksafak/',
    failed: 'I could not send the email right now. You can also reach him on LinkedIn: https://www.linkedin.com/in/buraksafak/',
    cancelled: 'Okay, I did not send an email. Ask me anything else if you want.',
    rateLimitedCooldown: 'I just sent a message. You can leave another one in 15 minutes.',
    rateLimitedIp: 'This device reached today’s message limit. Please try again tomorrow.',
    rateLimitedEmail: 'This email already left a message today. Please try again tomorrow.',
    rateLimitedGlobal: 'Too many messages arrived today. Please try again tomorrow.',
  },
} as const;

export class ContactService {
  private readonly sessions = new Map<string, ContactSession>();
  private readonly sendingIps = new Set<string>();

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
    const blocked = await this.checkSendLimit({
      ipAddress: input.ipAddress,
      locale,
    });
    if (blocked) {
      return { handled: true, reply: blocked, submitted: false };
    }

    const session: ContactSession = {
      step: 'consent',
      draft: {},
      locale,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      updatedAt: Date.now(),
    };
    this.sessions.set(key, session);

    if (alreadyWantsEmail(message) || isConfirmYes(message)) {
      session.step = 'name';
      return { handled: true, reply: COPY[locale].askName, submitted: false };
    }

    return { handled: true, reply: COPY[locale].askConsent, submitted: false };
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

    if (session.step === 'consent') {
      if (isConfirmNo(message)) {
        this.sessions.delete(key);
        return { handled: true, reply: copy.cancelled, submitted: false };
      }
      if (!isConfirmYes(message) && !alreadyWantsEmail(message)) {
        return { handled: true, reply: copy.consentHint, submitted: false };
      }
      session.step = 'name';
      return { handled: true, reply: copy.askName, submitted: false };
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

      const email = parsed.data.toLowerCase();
      const blocked = await this.checkSendLimit({
        ipAddress: session.ipAddress,
        email,
        locale: session.locale,
      });
      if (blocked) {
        this.sessions.delete(key);
        return { handled: true, reply: blocked, submitted: false };
      }

      session.draft.email = email;
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

    return this.submitDraft(key, session);
  }

  private async submitDraft(
    key: string,
    session: ContactSession,
  ): Promise<ContactHandleResult> {
    const copy = COPY[session.locale];
    const draft = this.requireDraft(session.draft);
    const ipLock = session.ipAddress ?? 'unknown';
    if (this.sendingIps.has(ipLock)) {
      return { handled: true, reply: copy.rateLimitedCooldown, submitted: false };
    }

    this.sendingIps.add(ipLock);
    try {
      const blocked = await this.checkSendLimit({
        ipAddress: session.ipAddress,
        email: draft.email,
        locale: session.locale,
      });
      if (blocked) {
        this.sessions.delete(key);
        return { handled: true, reply: blocked, submitted: false };
      }

      this.sessions.delete(key);

      const saved = await contactRepository.create({
        ...draft,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      });

      if (!mailService.isConfigured()) {
        logger.warn({ contactId: saved.id }, 'Contact saved but Resend is not configured');
        return { handled: true, reply: copy.notConfigured, submitted: false };
      }

      const mail = await mailService.sendContactMessage(draft);
      if (mail.sent) {
        await contactRepository.markEmailSent(saved.id);
        return { handled: true, reply: copy.sent, submitted: true };
      }

      logger.warn({ contactId: saved.id, error: mail.error }, 'Contact saved without email');
      return { handled: true, reply: copy.failed, submitted: false };
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to persist contact message');
      return { handled: true, reply: copy.failed, submitted: false };
    } finally {
      this.sendingIps.delete(ipLock);
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

  private async checkSendLimit(input: {
    ipAddress: string | null;
    email?: string;
    locale: ContactLocale;
  }): Promise<string | null> {
    const reason = await this.resolveRateLimit(input.ipAddress, input.email);
    if (!reason) {
      return null;
    }

    return this.rateLimitReply(input.locale, reason);
  }

  private async resolveRateLimit(
    ipAddress: string | null,
    email?: string,
  ): Promise<RateLimitReason | null> {
    const now = Date.now();
    const sinceDay = new Date(now - DAY_MS);

    const [globalCount, ipCount] = await Promise.all([
      contactRepository.countSince(sinceDay),
      contactRepository.countSince(sinceDay, { ipAddress }),
    ]);

    if (globalCount >= MAX_SENDS_GLOBAL_DAY) {
      return 'global';
    }

    if (ipCount >= MAX_SENDS_PER_IP_DAY) {
      return 'ip';
    }

    const lastAt = await contactRepository.lastCreatedAtByIp(ipAddress);
    if (lastAt && now - lastAt.getTime() < SEND_COOLDOWN_MS) {
      return 'cooldown';
    }

    if (email) {
      const emailCount = await contactRepository.countSince(sinceDay, { email });
      if (emailCount >= MAX_SENDS_PER_EMAIL_DAY) {
        return 'email';
      }
    }

    return null;
  }

  private rateLimitReply(locale: ContactLocale, reason: RateLimitReason): string {
    const copy = COPY[locale];
    switch (reason) {
      case 'cooldown':
        return copy.rateLimitedCooldown;
      case 'email':
        return copy.rateLimitedEmail;
      case 'global':
        return copy.rateLimitedGlobal;
      default:
        return copy.rateLimitedIp;
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(key);
      }
    }
  }
}

export const contactService = new ContactService();
