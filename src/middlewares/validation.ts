import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../types/errors';

export const chatMessageSchema = z.object({
  message: z
    .string({ required_error: 'message is required', invalid_type_error: 'message must be a string' })
    .trim()
    .min(2, 'message must be at least 2 characters')
    .max(1000, 'message must be at most 1000 characters'),
});

export type ChatMessageBody = z.infer<typeof chatMessageSchema>;

export const validateChatMessage: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const result = chatMessageSchema.safeParse(req.body);

  if (!result.success) {
    next(new ValidationError('Invalid request', result.error.flatten()));
    return;
  }

  req.body = result.data;
  next();
};
