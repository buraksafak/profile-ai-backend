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

  async countSince(since: Date, filter: { ipAddress?: string | null; email?: string } = {}): Promise<number> {
    return prisma.contactMessage.count({
      where: {
        createdAt: { gte: since },
        ...(filter.ipAddress !== undefined ? { ipAddress: filter.ipAddress } : {}),
        ...(filter.email ? { email: filter.email } : {}),
      },
    });
  }

  async lastCreatedAtByIp(ipAddress: string | null): Promise<Date | null> {
    const latest = await prisma.contactMessage.findFirst({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return latest?.createdAt ?? null;
  }
}

export const contactRepository = new ContactRepository();
