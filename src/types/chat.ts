export interface ChatRequestBody {
  message: string;
}

export interface ChatResponseDto {
  id: string | null;
  reply: string;
  model: string;
  responseTimeMs: number;
  persisted: boolean;
  createdAt: string | null;
}
