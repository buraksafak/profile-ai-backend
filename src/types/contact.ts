export type ContactLocale = 'tr' | 'en';

export type ContactStep = 'consent' | 'name' | 'email' | 'subject' | 'body';

export interface ContactDraft {
  name?: string;
  email?: string;
  subject?: string;
  body?: string;
}

export interface ContactHandleInput {
  message: string;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId?: string;
}

export type ContactHandleResult =
  | { handled: false }
  | { handled: true; reply: string; submitted: boolean };

export interface CreateContactMessageInput {
  name: string;
  email: string;
  subject: string;
  body: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SendContactEmailInput {
  name: string;
  email: string;
  subject: string;
  body: string;
}

export interface SendContactEmailResult {
  sent: boolean;
  error?: string;
}
