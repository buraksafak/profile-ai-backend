import type { Request, Response } from 'express';
import { knowledgeService } from '../services/knowledge.service';
import { LEARNING_REVIEW_STATUSES, type LearningReviewStatus } from '../types/learning';
import { ValidationError } from '../types/errors';

function parseStatus(value: unknown): LearningReviewStatus {
  if (typeof value !== 'string' || !LEARNING_REVIEW_STATUSES.includes(value as LearningReviewStatus)) {
    return 'pending';
  }

  return value as LearningReviewStatus;
}

function parseLimit(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : 50;
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return parsed;
}

export class LearningController {
  async listReviews(req: Request, res: Response): Promise<void> {
    const status = parseStatus(req.query.status);
    const limit = parseLimit(req.query.limit);
    const data = await knowledgeService.listReviews(status, limit);

    res.status(200).json({
      success: true,
      data,
    });
  }

  async approveReview(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const data = await knowledgeService.approveReview(id, req.body);

    res.status(200).json({
      success: true,
      data,
    });
  }

  async rejectReview(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const data = await knowledgeService.rejectReview(id, req.body ?? {});

    res.status(200).json({
      success: true,
      data,
    });
  }

  async listFacts(req: Request, res: Response): Promise<void> {
    const activeOnly = req.query.active === 'true';
    const data = await knowledgeService.listFacts(activeOnly);

    res.status(200).json({
      success: true,
      data,
    });
  }

  async createFact(req: Request, res: Response): Promise<void> {
    const data = await knowledgeService.createFact(req.body);

    res.status(201).json({
      success: true,
      data,
    });
  }

  async updateFact(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    if (req.body.content === undefined && req.body.active === undefined) {
      throw new ValidationError('Provide content and/or active');
    }

    const data = await knowledgeService.updateFact(id, req.body);

    res.status(200).json({
      success: true,
      data,
    });
  }
}

export const learningController = new LearningController();
