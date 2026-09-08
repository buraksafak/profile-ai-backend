import { Router } from 'express';
import { geminiController } from '../controllers/gemini.controller';
import { authenticate } from '../middlewares/authenticate';
import { asyncHandler } from '../middlewares/async-handler';
import { validate } from '../middlewares/validate';
import { generateContentSchema } from '../utils/schemas';

export const geminiRouter = Router();

geminiRouter.post(
  '/generate',
  authenticate,
  validate(generateContentSchema),
  asyncHandler((req, res) => geminiController.generate(req, res)),
);
