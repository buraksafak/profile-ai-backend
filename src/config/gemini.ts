import { ThinkingLevel, type GenerateContentConfig } from '@google/genai';
import { env } from './env';

export const GEMINI_MODEL = env.GEMINI_MODEL;
export const GEMINI_MAX_OUTPUT_TOKENS = 1024;

export function createGenerateConfig(
  overrides: GenerateContentConfig = {},
): GenerateContentConfig {
  return {
    maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.MINIMAL,
      includeThoughts: false,
    },
    ...overrides,
  };
}
