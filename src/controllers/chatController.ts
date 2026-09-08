import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { contactService } from '../services/contact.service';
import { healthService } from '../services/health.service';
import { knowledgeService } from '../services/knowledge.service';
import { messageRepository } from '../repositories/messageRepository';
import { logger } from '../utils/logger';
import { getClientIp, getUserAgent } from '../utils/request';
import type { ChatRequestBody, ChatResponseDto } from '../types/chat';

export class ChatController {
  async chat(req: Request, res: Response): Promise<void> {
    const { message, sessionId } = req.body as ChatRequestBody;
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const startedAt = Date.now();

    const contactResult = await contactService.handle({
      message,
      ipAddress,
      userAgent,
      sessionId,
    });

    if (contactResult.handled) {
      this.respondAndPersist(req, res, {
        message,
        reply: contactResult.reply,
        model: 'contact-flow',
        responseTimeMs: Date.now() - startedAt,
        ipAddress,
        userAgent,
        captureUnknown: false,
      });
      return;
    }

    const aiResult = await aiService.generateResponse(message);
    this.respondAndPersist(req, res, {
      message,
      reply: aiResult.text,
      model: aiResult.model,
      responseTimeMs: aiResult.durationMs ?? Date.now() - startedAt,
      ipAddress,
      userAgent,
      captureUnknown: true,
    });
  }

  private respondAndPersist(
    req: Request,
    res: Response,
    input: {
      message: string;
      reply: string;
      model: string;
      responseTimeMs: number;
      ipAddress: string | null;
      userAgent: string | null;
      captureUnknown: boolean;
    },
  ): void {
    const messageId = randomUUID();
    const createdAt = new Date();

    const data: ChatResponseDto = {
      id: messageId,
      reply: input.reply,
      model: input.model,
      responseTimeMs: input.responseTimeMs,
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
        userPrompt: input.message,
        aiResponse: input.reply,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        responseTimeMs: input.responseTimeMs,
        createdAt,
      })
      .then(() => {
        if (!input.captureUnknown) {
          return;
        }

        return knowledgeService.captureUnknownReply({
          messageId,
          userPrompt: input.message,
          aiResponse: input.reply,
        });
      })
      .catch((error: unknown) => {
        logger.error(
          { err: error, requestId: req.requestId, ipAddress: input.ipAddress, messageId },
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
