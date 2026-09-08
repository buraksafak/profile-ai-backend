import type { Request, Response } from 'express';
import { aiService } from '../services/aiService';

export class GeminiController {
  async generate(req: Request, res: Response): Promise<void> {
    const result = await aiService.generateResponse(req.body.prompt);
    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

export const geminiController = new GeminiController();
