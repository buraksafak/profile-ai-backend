import type { Message } from '@prisma/client';
import { prisma } from '../config/db';
import type { CreateMessageInput } from '../types/message';

export class MessageRepository {
  async create(data: CreateMessageInput): Promise<Message> {
    return prisma.message.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        userPrompt: data.userPrompt,
        aiResponse: data.aiResponse,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        responseTimeMs: data.responseTimeMs ?? null,
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      },
    });
  }

  async saveUserAndAiMessage(data: CreateMessageInput): Promise<Message> {
    return this.create(data);
  }

  async findById(id: string): Promise<Message | null> {
    return prisma.message.findUnique({ where: { id } });
  }

  async findRecent(limit = 50): Promise<Message[]> {
    return prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }
}

export const messageRepository = new MessageRepository();
