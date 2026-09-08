export interface CreateMessageInput {
  id?: string;
  userPrompt: string;
  aiResponse: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  responseTimeMs?: number | null;
  createdAt?: Date;
}

export interface MessageDto {
  id: string;
  userPrompt: string;
  aiResponse: string;
  ipAddress: string | null;
  userAgent: string | null;
  responseTimeMs: number | null;
  createdAt: Date;
}
