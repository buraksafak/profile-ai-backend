import { GoogleGenAI } from '@google/genai';
import { createGenerateConfig, GEMINI_MODEL } from '../config/gemini';
import { env } from '../config/env';
import { buildSystemPrompt } from '../config/prompt';
import { logger } from '../utils/logger';
import { wrapVisitorMessage } from '../utils/prompt-guard';
import { stripMarkdownEmphasis } from '../utils/text';
import { knowledgeService } from './knowledge.service';
import { AppError, ExternalServiceError } from '../types/errors';
import type { GenerateResponseResult } from '../types/gemini';

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as { status?: unknown; statusCode?: unknown };
  if (typeof candidate.status === 'number') {
    return candidate.status;
  }
  if (typeof candidate.statusCode === 'number') {
    return candidate.statusCode;
  }
  return undefined;
}

function mapGeminiError(error: unknown): ExternalServiceError {
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : '';

  if (status === 401 || status === 403 || /api key|unauthoriz|permission|forbidden/i.test(message)) {
    return new ExternalServiceError(
      'AI service authentication failed. Please try again later.',
    );
  }

  if (status === 429 || /quota|resource exhausted|rate limit/i.test(message)) {
    return new ExternalServiceError(
      'The AI service is busy right now. Please try again in a moment.',
    );
  }

  if (status === 400 || /invalid argument|invalid request/i.test(message)) {
    return new ExternalServiceError(
      'The request could not be processed. Please rephrase your question and try again.',
    );
  }

  if (status === 503 || status === 504 || /unavailable|timeout|deadline/i.test(message)) {
    return new ExternalServiceError(
      'The AI service is temporarily unavailable. Please try again shortly.',
    );
  }

  return new ExternalServiceError(
    'An error occurred while generating a response. Please try again later.',
  );
}

export class AiService {
  private readonly client: GoogleGenAI;
  private readonly model = GEMINI_MODEL;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async generateResponse(userPrompt: string): Promise<GenerateResponseResult> {
    if (!env.GEMINI_API_KEY) {
      throw new AppError(503, 'GEMINI_API_KEY is not configured', 'GEMINI_NOT_CONFIGURED');
    }

    const startedAt = Date.now();
    const approvedFacts = await knowledgeService.getApprovedFactContents();

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: wrapVisitorMessage(userPrompt),
        config: createGenerateConfig({
          systemInstruction: buildSystemPrompt(approvedFacts),
        }),
      });

      const durationMs = Date.now() - startedAt;
      const text = stripMarkdownEmphasis(response.text?.trim() ?? '');

      if (!text) {
        logger.warn({ model: this.model, durationMs }, 'Gemini returned an empty response');
        throw new ExternalServiceError('Gemini returned an empty response');
      }

      logger.info(
        {
          model: this.model,
          durationMs,
          promptTokens: response.usageMetadata?.promptTokenCount,
          outputTokens: response.usageMetadata?.candidatesTokenCount,
          thoughtsTokens: response.usageMetadata?.thoughtsTokenCount ?? 0,
        },
        'Gemini response generated',
      );
      return { text, model: this.model, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (error instanceof AppError) {
        logger.warn({ err: error, durationMs }, 'Gemini request rejected');
        throw error;
      }

      logger.error({ err: error, durationMs }, 'Gemini API call failed');
      throw mapGeminiError(error);
    }
  }
}

export const aiService = new AiService();

export function generateResponse(userPrompt: string): Promise<GenerateResponseResult> {
  return aiService.generateResponse(userPrompt);
}
