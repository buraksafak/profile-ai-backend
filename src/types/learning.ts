export const LEARNING_REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type LearningReviewStatus = (typeof LEARNING_REVIEW_STATUSES)[number];

export interface CaptureUnknownReplyInput {
  messageId: string;
  userPrompt: string;
  aiResponse: string;
}

export interface ApproveReviewInput {
  content: string;
}

export interface RejectReviewInput {
  note?: string;
}

export interface CreateFactInput {
  content: string;
}

export interface UpdateFactInput {
  content?: string;
  active?: boolean;
}
