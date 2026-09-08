import { prisma } from '../config/db';
import type { CreateContactMessageInput } from '../types/contact';

export class ContactRepository {
  async create(data: CreateContactMessageInput) {
    return prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        body: data.body,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  }

  async markEmailSent(id: string): Promise<void> {
    await prisma.contactMessage.update({
      where: { id },
      data: { emailSent: true },
    });
  }
}

export const contactRepository = new ContactRepository();
