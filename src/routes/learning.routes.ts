import { Router } from 'express';
import { learningController } from '../controllers/learning.controller';
import { authenticate } from '../middlewares/authenticate';
import { asyncHandler } from '../middlewares/async-handler';
import { validate } from '../middlewares/validate';
import {
  approveReviewSchema,
  createFactSchema,
  listFactsQuerySchema,
  listReviewsQuerySchema,
  rejectReviewSchema,
  updateFactSchema,
} from '../utils/schemas';

export const learningRouter = Router();

learningRouter.use(authenticate);

learningRouter.get(
  '/reviews',
  validate(listReviewsQuerySchema),
  asyncHandler((req, res) => learningController.listReviews(req, res)),
);

learningRouter.post(
  '/reviews/:id/approve',
  validate(approveReviewSchema),
  asyncHandler((req, res) => learningController.approveReview(req, res)),
);

learningRouter.post(
  '/reviews/:id/reject',
  validate(rejectReviewSchema),
  asyncHandler((req, res) => learningController.rejectReview(req, res)),
);

learningRouter.get(
  '/facts',
  validate(listFactsQuerySchema),
  asyncHandler((req, res) => learningController.listFacts(req, res)),
);

learningRouter.post(
  '/facts',
  validate(createFactSchema),
  asyncHandler((req, res) => learningController.createFact(req, res)),
);

learningRouter.patch(
  '/facts/:id',
  validate(updateFactSchema),
  asyncHandler((req, res) => learningController.updateFact(req, res)),
);
