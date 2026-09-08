import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { healthService } from '../services/health.service';
import { knowledgeService } from '../services/knowledge.service';
import { messageRepository } from '../repositories/messageRepository';
import { logger } from '../utils/logger';
import { getClientIp, getUserAgent } from '../utils/request';
import type { ChatRequestBody, ChatResponseDto } from '../types/chat';

export class ChatController {
  async chat(req: Request, res: Response): Promise<void> {
    const { message } = req.body as ChatRequestBody;
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const startedAt = Date.now();

    const aiResult = await aiService.generateResponse(message);
    const responseTimeMs = aiResult.durationMs ?? Date.now() - startedAt;
    const messageId = randomUUID();
    const createdAt = new Date();

    const data: ChatResponseDto = {
      id: messageId,
      reply: aiResult.text,
      model: aiResult.model,
      responseTimeMs,
      persisted: true,
      createdAt: createdAt.toISOString(),
    };

    res.status(200).json({
      success: true,
      data,
    });

    void messageRepository
      .saveUserAndAiMessage({
        id: messageId,
        userPrompt: message,
        aiResponse: aiResult.text,
        ipAddress,
        userAgent,
        responseTimeMs,
        createdAt,
      })
      .then(() =>
        knowledgeService.captureUnknownReply({
          messageId,
          userPrompt: message,
          aiResponse: aiResult.text,
        }),
      )
      .catch((error: unknown) => {
        logger.error(
          { err: error, requestId: req.requestId, ipAddress, messageId },
          'Failed to persist chat message',
        );
      });
  }

  async health(_req: Request, res: Response): Promise<void> {
    const data = await healthService.getFullStatus();
    const ok = data.status === 'ok' && data.database.status === 'up';

    res.status(ok ? 200 : 503).json({
      success: ok,
      data,
    });
  }
}

export const chatController = new ChatController();
