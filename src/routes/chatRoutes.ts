import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { asyncHandler } from '../middlewares/async-handler';
import { chatRateLimiter } from '../middlewares/security';
import { validateChatMessage } from '../middlewares/validation';

export const chatRouter = Router();

chatRouter.post(
  '/chat',
  chatRateLimiter,
  validateChatMessage,
  asyncHandler((req, res) => chatController.chat(req, res)),
);

chatRouter.get(
  '/health',
  asyncHandler((req, res) => chatController.health(req, res)),
);

export { chatRouter as chatRoutes };
