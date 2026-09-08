import type { KnowledgeFact, LearningReview } from '@prisma/client';
import { prisma } from '../config/db';
import type { LearningReviewStatus } from '../types/learning';

export class LearningRepository {
  async findPendingByNormalizedPrompt(normalizedPrompt: string): Promise<LearningReview | null> {
    return prisma.learningReview.findFirst({
      where: { normalizedPrompt, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async incrementOccurrence(id: string): Promise<LearningReview> {
    return prisma.learningReview.update({
      where: { id },
      data: { occurrenceCount: { increment: 1 } },
    });
  }

  async createReview(data: {
    messageId: string;
    userPrompt: string;
    normalizedPrompt: string;
    aiResponse: string;
    reason: string;
  }): Promise<LearningReview> {
    return prisma.learningReview.create({
      data: {
        messageId: data.messageId,
        userPrompt: data.userPrompt,
        normalizedPrompt: data.normalizedPrompt,
        aiResponse: data.aiResponse,
        reason: data.reason,
        status: 'pending',
      },
    });
  }

  async findReviewById(id: string): Promise<LearningReview | null> {
    return prisma.learningReview.findUnique({ where: { id } });
  }

  async listReviews(status: LearningReviewStatus, limit: number): Promise<LearningReview[]> {
    return prisma.learningReview.findMany({
      where: { status },
      orderBy: [{ occurrenceCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async rejectReview(id: string, note?: string): Promise<LearningReview> {
    return prisma.learningReview.update({
      where: { id },
      data: {
        status: 'rejected',
        note: note ?? null,
        reviewedAt: new Date(),
      },
    });
  }

  async createFact(content: string): Promise<KnowledgeFact> {
    return prisma.knowledgeFact.create({
      data: { content },
    });
  }

  async findFactById(id: string): Promise<KnowledgeFact | null> {
    return prisma.knowledgeFact.findUnique({ where: { id } });
  }

  async listFacts(activeOnly: boolean): Promise<KnowledgeFact[]> {
    return prisma.knowledgeFact.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActiveFactContents(): Promise<string[]> {
    const facts = await prisma.knowledgeFact.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });

    return facts.map((fact) => fact.content);
  }

  async updateFact(
    id: string,
    data: { content?: string; active?: boolean },
  ): Promise<KnowledgeFact> {
    return prisma.knowledgeFact.update({
      where: { id },
      data,
    });
  }

  async approveReviewWithFact(reviewId: string, content: string): Promise<{
    review: LearningReview;
    fact: KnowledgeFact;
  }> {
    return prisma.$transaction(async (tx) => {
      const fact = await tx.knowledgeFact.create({
        data: { content },
      });

      const review = await tx.learningReview.update({
        where: { id: reviewId },
        data: {
          status: 'approved',
          factId: fact.id,
          reviewedAt: new Date(),
        },
      });

      return { review, fact };
    });
  }
}

export const learningRepository = new LearningRepository();
