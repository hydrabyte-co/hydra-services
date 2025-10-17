import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware that ensures every request has a correlation ID
 *
 * Features:
 * - Generates correlation ID if not present in request
 * - Propagates existing correlation ID from upstream services
 * - Adds correlation ID to response headers
 * - Enables end-to-end request tracking across microservices
 *
 * @example
 * // In AppModule
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(CorrelationIdMiddleware).forRoutes('*');
 *   }
 * }
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get existing correlation ID from request header (case-insensitive)
    let correlationId = req.headers['x-correlation-id'] as string;

    // Generate new correlation ID if not present
    if (!correlationId) {
      correlationId = uuidv4();
    }

    // Store correlation ID in request for use by other components
    // This allows loggers, error handlers, etc. to access it
    (req as any).correlationId = correlationId;

    // Add correlation ID to response headers
    // This allows clients to track requests end-to-end
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
