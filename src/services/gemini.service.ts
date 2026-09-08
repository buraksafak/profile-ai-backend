import { GoogleGenAI } from '@google/genai';
import { createGenerateConfig, GEMINI_MODEL } from '../config/gemini';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ExternalServiceError, AppError } from '../types/errors';
import type { GenerateContentInput, GenerateContentResult } from '../types/gemini';

export class GeminiService {
  private readonly client: GoogleGenAI;
  private readonly model = GEMINI_MODEL;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async generateContent(input: GenerateContentInput): Promise<GenerateContentResult> {
    if (!env.GEMINI_API_KEY) {
      throw new AppError(503, 'GEMINI_API_KEY is not configured', 'GEMINI_NOT_CONFIGURED');
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: input.prompt,
        config: createGenerateConfig(),
      });

      const text = response.text?.trim() ?? '';
      if (!text) {
        throw new ExternalServiceError('Gemini returned an empty response');
      }

      logger.info(
        {
          model: this.model,
          promptTokens: response.usageMetadata?.promptTokenCount,
          outputTokens: response.usageMetadata?.candidatesTokenCount,
          thoughtsTokens: response.usageMetadata?.thoughtsTokenCount ?? 0,
        },
        'Gemini content generated',
      );
      return { text, model: this.model };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error({ err: error }, 'Gemini API call failed');
      throw new ExternalServiceError('Failed to generate content with Gemini');
    }
  }
}

export const geminiService = new GeminiService();
