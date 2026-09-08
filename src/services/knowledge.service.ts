import { learningRepository } from '../repositories/learning.repository';
import { logger } from '../utils/logger';
import { looksLikeUnknownReply, normalizePrompt } from '../utils/unknown-reply';
import { NotFoundError, ValidationError } from '../types/errors';
import type {
  ApproveReviewInput,
  CaptureUnknownReplyInput,
  CreateFactInput,
  LearningReviewStatus,
  RejectReviewInput,
  UpdateFactInput,
} from '../types/learning';

const FACT_CACHE_TTL_MS = 15_000;

export class KnowledgeService {
  private factCache: { contents: string[]; loadedAt: number } | null = null;

  invalidateFactCache(): void {
    this.factCache = null;
  }

  async getApprovedFactContents(): Promise<string[]> {
    const now = Date.now();
    if (this.factCache && now - this.factCache.loadedAt < FACT_CACHE_TTL_MS) {
      return this.factCache.contents;
    }

    const contents = await learningRepository.listActiveFactContents();
    this.factCache = { contents, loadedAt: now };
    return contents;
  }

  async captureUnknownReply(input: CaptureUnknownReplyInput): Promise<void> {
    if (!looksLikeUnknownReply(input.aiResponse)) {
      return;
    }

    const normalizedPrompt = normalizePrompt(input.userPrompt);
    if (normalizedPrompt.length < 2) {
      return;
    }

    try {
      const existing = await learningRepository.findPendingByNormalizedPrompt(normalizedPrompt);
      if (existing) {
        await learningRepository.incrementOccurrence(existing.id);
        logger.info(
          { reviewId: existing.id, occurrenceCount: existing.occurrenceCount + 1 },
          'Learning review occurrence incremented',
        );
        return;
      }

      const created = await learningRepository.createReview({
        messageId: input.messageId,
        userPrompt: input.userPrompt,
        normalizedPrompt,
        aiResponse: input.aiResponse,
        reason: 'unknown_answer',
      });

      logger.info({ reviewId: created.id, messageId: input.messageId }, 'Learning review queued');
    } catch (error: unknown) {
      logger.error({ err: error, messageId: input.messageId }, 'Failed to queue learning review');
    }
  }

  async listReviews(status: LearningReviewStatus, limit = 50) {
    return learningRepository.listReviews(status, Math.min(Math.max(limit, 1), 100));
  }

  async listFacts(activeOnly = false) {
    return learningRepository.listFacts(activeOnly);
  }

  async approveReview(id: string, input: ApproveReviewInput) {
    const review = await learningRepository.findReviewById(id);
    if (!review) {
      throw new NotFoundError('Learning review not found');
    }

    if (review.status !== 'pending') {
      throw new ValidationError('Review is no longer pending');
    }

    const result = await learningRepository.approveReviewWithFact(id, input.content.trim());
    this.invalidateFactCache();
    return result;
  }

  async rejectReview(id: string, input: RejectReviewInput = {}) {
    const review = await learningRepository.findReviewById(id);
    if (!review) {
      throw new NotFoundError('Learning review not found');
    }

    if (review.status !== 'pending') {
      throw new ValidationError('Review is no longer pending');
    }

    return learningRepository.rejectReview(id, input.note);
  }

  async createFact(input: CreateFactInput) {
    const fact = await learningRepository.createFact(input.content.trim());
    this.invalidateFactCache();
    return fact;
  }

  async updateFact(id: string, input: UpdateFactInput) {
    const fact = await learningRepository.findFactById(id);
    if (!fact) {
      throw new NotFoundError('Knowledge fact not found');
    }

    const updated = await learningRepository.updateFact(id, {
      ...(input.content !== undefined ? { content: input.content.trim() } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });
    this.invalidateFactCache();
    return updated;
  }
}

export const knowledgeService = new KnowledgeService();
