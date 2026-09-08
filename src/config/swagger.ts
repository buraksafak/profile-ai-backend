import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { JsonObject } from 'swagger-ui-express';
import { env } from './env';

const errorSchema = {
  type: 'object',
  required: ['success', 'error'],
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Invalid request' },
        details: {},
        requestId: { type: 'string', format: 'uuid' },
      },
    },
  },
};

export const swaggerSpec: JsonObject = {
  openapi: '3.0.3',
  info: {
    title: 'Profile AI API',
    version: '1.0.0',
    description: 'Profile AI backend — Express.js, TypeScript, Prisma, Gemini',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Local server',
    },
  ],
  tags: [
    { name: 'Root', description: 'Service info' },
    { name: 'Health', description: 'Liveness and readiness' },
    { name: 'Chat', description: 'Chat with Gemini' },
    { name: 'Gemini', description: 'Direct Gemini generation' },
    { name: 'Profiles', description: 'Profile CRUD' },
    { name: 'Learning', description: 'Review unknown answers and approve knowledge facts' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API secret key',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Same value as x-api-key, sent as Bearer token',
      },
    },
    schemas: {
      ErrorResponse: errorSchema,
      HealthStatus: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: ['status', 'uptime', 'timestamp'],
            properties: {
              status: { type: 'string', enum: ['ok'] },
              uptime: { type: 'number', example: 12.34 },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      ReadyStatus: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            required: ['status', 'database', 'timestamp'],
            properties: {
              status: { type: 'string', enum: ['ready', 'degraded'] },
              database: { type: 'string', enum: ['up', 'down'] },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      FullHealthStatus: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            required: ['status', 'server', 'database'],
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded'] },
              server: {
                type: 'object',
                required: ['status', 'uptime', 'timestamp'],
                properties: {
                  status: { type: 'string', enum: ['up'] },
                  uptime: { type: 'number' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
              database: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['up', 'down'] },
                },
              },
            },
          },
        },
      },
      ChatRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            minLength: 2,
            maxLength: 1000,
            example: 'Tell me about this profile',
          },
          sessionId: {
            type: 'string',
            minLength: 8,
            maxLength: 80,
            description: 'Optional client session id. Keeps the contact flow on the same visitor.',
          },
        },
      },
      ChatResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: ['id', 'reply', 'model', 'responseTimeMs', 'persisted', 'createdAt'],
            properties: {
              id: { type: 'string', format: 'uuid', nullable: true },
              reply: { type: 'string' },
              model: { type: 'string', example: 'gemini-3.5-flash-lite' },
              responseTimeMs: { type: 'integer', example: 420 },
              persisted: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
      },
      GenerateContentRequest: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: {
            type: 'string',
            minLength: 1,
            maxLength: 8000,
            example: 'Summarize this profile',
          },
        },
      },
      GenerateContentResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: ['text', 'model', 'durationMs'],
            properties: {
              text: { type: 'string' },
              model: { type: 'string', example: 'gemini-3.5-flash-lite' },
              durationMs: { type: 'integer', example: 380 },
            },
          },
        },
      },
      CreateProfileRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120, example: 'Ada Lovelace' },
          bio: { type: 'string', maxLength: 2000, example: 'Mathematician and writer' },
        },
      },
      Profile: {
        type: 'object',
        required: ['id', 'name', 'bio', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          bio: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProfileResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/Profile' },
        },
      },
      ProfileListResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Profile' },
          },
        },
      },
      LearningReview: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          messageId: { type: 'string', format: 'uuid', nullable: true },
          userPrompt: { type: 'string' },
          normalizedPrompt: { type: 'string' },
          aiResponse: { type: 'string' },
          reason: { type: 'string', example: 'unknown_answer' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          occurrenceCount: { type: 'integer', example: 3 },
          note: { type: 'string', nullable: true },
          factId: { type: 'string', format: 'uuid', nullable: true },
          reviewedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      KnowledgeFact: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ApproveReviewRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'string',
            minLength: 8,
            maxLength: 2000,
            example: 'Açık kaynaklı projelere katkısı zayıftır.',
          },
        },
      },
      CreateFactRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'string',
            minLength: 8,
            maxLength: 2000,
            example: 'Hafta içi e-posta mesajlarına genelde 1 iş günü içinde döner.',
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Validation failed or malformed JSON',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Unauthorized: {
        description: 'Missing or invalid API key',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Resource or route not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      ServiceUnavailable: {
        description: 'Dependency is down or not configured',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      BadGateway: {
        description: 'Upstream AI service failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
  paths: {
    '/': {
      get: {
        tags: ['Root'],
        summary: 'Service metadata',
        responses: {
          200: {
            description: 'Service is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: 'profile-ai' },
                        env: { type: 'string', example: 'development' },
                        docs: { type: 'string', example: '/docs' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Full health check (server + database)',
        responses: {
          200: {
            description: 'Healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FullHealthStatus' },
              },
            },
          },
          503: { $ref: '#/components/responses/ServiceUnavailable' },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Full health check (legacy path)',
        responses: {
          200: {
            description: 'Healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FullHealthStatus' },
              },
            },
          },
          503: { $ref: '#/components/responses/ServiceUnavailable' },
        },
      },
    },
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness',
        responses: {
          200: {
            description: 'Process is alive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },
    '/api/v1/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness (database ping)',
        responses: {
          200: {
            description: 'Ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReadyStatus' },
              },
            },
          },
          503: {
            description: 'Database is down',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReadyStatus' },
              },
            },
          },
        },
      },
    },
    '/api/chat': {
      post: {
        tags: ['Chat'],
        summary: 'Send a chat message. Contact intent starts a guided name / email / title / topic flow.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Generated reply',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          429: { $ref: '#/components/responses/TooManyRequests' },
          502: { $ref: '#/components/responses/BadGateway' },
          503: { $ref: '#/components/responses/ServiceUnavailable' },
        },
      },
    },
    '/api/v1/gemini/generate': {
      post: {
        tags: ['Gemini'],
        summary: 'Generate content with Gemini',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GenerateContentRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Generated content',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GenerateContentResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/TooManyRequests' },
          502: { $ref: '#/components/responses/BadGateway' },
          503: { $ref: '#/components/responses/ServiceUnavailable' },
        },
      },
    },
    '/api/v1/profiles': {
      post: {
        tags: ['Profiles'],
        summary: 'Create a profile',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProfileRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Profile created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProfileResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
      get: {
        tags: ['Profiles'],
        summary: 'List profiles',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProfileListResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/v1/profiles/{id}': {
      get: {
        tags: ['Profiles'],
        summary: 'Get profile by id',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProfileResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/v1/learning/reviews': {
      get: {
        tags: ['Learning'],
        summary: 'List learning reviews',
        description: 'Unknown-answer chats queued for Burak to approve as knowledge facts.',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'approved', 'rejected'], default: 'pending' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Review list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/LearningReview' } },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/learning/reviews/{id}/approve': {
      post: {
        tags: ['Learning'],
        summary: 'Approve a review and add a knowledge fact',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApproveReviewRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Approved' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/learning/reviews/{id}/reject': {
      post: {
        tags: ['Learning'],
        summary: 'Reject a learning review',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { note: { type: 'string', maxLength: 1000 } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Rejected' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/learning/facts': {
      get: {
        tags: ['Learning'],
        summary: 'List knowledge facts',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          {
            name: 'active',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
        ],
        responses: {
          200: {
            description: 'Fact list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/KnowledgeFact' } },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Learning'],
        summary: 'Create a knowledge fact without a review',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateFactRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Fact created' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/learning/facts/{id}': {
      patch: {
        tags: ['Learning'],
        summary: 'Update or deactivate a knowledge fact',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string', minLength: 8, maxLength: 2000 },
                  active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Fact updated' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  app.get('/docs.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  app.use('/docs', (_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; font-src 'self' data:; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'",
    );
    next();
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Profile AI API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
}
