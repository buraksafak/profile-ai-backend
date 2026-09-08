import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { SendContactEmailInput, SendContactEmailResult } from '../types/contact';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compactHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export class MailService {
  private readonly client: Resend | null;

  constructor() {
    this.client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async sendContactMessage(input: SendContactEmailInput): Promise<SendContactEmailResult> {
    if (!this.client) {
      return { sent: false, error: 'not_configured' };
    }

    const name = compactHeader(input.name);
    const email = compactHeader(input.email);
    const subject = compactHeader(input.subject);
    const body = input.body.trim();

    const text = [
      'Sitedeki asistan üzerinden yeni bir mesaj geldi.',
      '',
      `Ad: ${name}`,
      `E-posta: ${email}`,
      `Başlık: ${subject}`,
      '',
      'Konu:',
      body,
    ].join('\n');

    const html = `
      <p>Sitedeki asistan üzerinden yeni bir mesaj geldi.</p>
      <p><strong>Ad:</strong> ${escapeHtml(name)}<br />
      <strong>E-posta:</strong> ${escapeHtml(email)}<br />
      <strong>Başlık:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Konu:</strong></p>
      <p>${escapeHtml(body).replace(/\n/g, '<br />')}</p>
    `.trim();

    try {
      const result = await this.client.emails.send({
        from: env.CONTACT_FROM_EMAIL,
        to: env.CONTACT_TO_EMAIL,
        replyTo: email,
        subject: `[buraksafak.online] ${subject}`,
        text,
        html,
      });

      if (result.error) {
        logger.error({ err: result.error }, 'Resend rejected contact email');
        return { sent: false, error: result.error.message };
      }

      logger.info({ emailId: result.data?.id, to: env.CONTACT_TO_EMAIL }, 'Contact email sent');
      return { sent: true };
    } catch (error: unknown) {
      logger.error({ err: error }, 'Resend request failed');
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'send_failed',
      };
    }
  }
}

export const mailService = new MailService();
