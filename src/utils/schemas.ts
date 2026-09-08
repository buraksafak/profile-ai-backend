import { z } from 'zod';

export const generateContentSchema = z.object({
  body: z.object({
    prompt: z.string().trim().min(1, 'prompt is required').max(8000),
  }),
});

export const createProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    bio: z.string().trim().max(2000).optional(),
  }),
});

export const profileIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const learningIdParams = z.object({
  id: z.string().uuid(),
});

export const listReviewsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const listFactsQuerySchema = z.object({
  query: z.object({
    active: z.enum(['true', 'false']).optional(),
  }),
});

export const approveReviewSchema = z.object({
  params: learningIdParams,
  body: z.object({
    content: z
      .string({ required_error: 'content is required' })
      .trim()
      .min(8, 'content must be at least 8 characters')
      .max(2000, 'content must be at most 2000 characters'),
  }),
});

export const rejectReviewSchema = z.object({
  params: learningIdParams,
  body: z
    .object({
      note: z.string().trim().max(1000).optional(),
    })
    .optional()
    .default({}),
});

export const createFactSchema = z.object({
  body: z.object({
    content: z
      .string({ required_error: 'content is required' })
      .trim()
      .min(8)
      .max(2000),
  }),
});

export const updateFactSchema = z.object({
  params: learningIdParams,
  body: z
    .object({
      content: z.string().trim().min(8).max(2000).optional(),
      active: z.boolean().optional(),
    })
    .refine((value) => value.content !== undefined || value.active !== undefined, {
      message: 'Provide content and/or active',
    }),
});
