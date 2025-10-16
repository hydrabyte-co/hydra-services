import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Queue } from 'bullmq';

export interface RedisHealthIndicatorOptions {
  timeout?: number;
}

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  /**
   * Check Redis health using a BullMQ queue client
   * @param key The key for the health check result
   * @param queue BullMQ Queue instance (provides Redis connection)
   * @param options Optional configuration
   */
  async isHealthy(
    key: string,
    queue: Queue,
    options: RedisHealthIndicatorOptions = {}
  ): Promise<HealthIndicatorResult> {
    const timeout = options.timeout || 1000;
    const startTime = Date.now();

    try {
      // Use BullMQ's client to ping Redis
      const client = await queue.client;
      await Promise.race([
        client.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), timeout)
        ),
      ]);

      const responseTime = Date.now() - startTime;

      const result = this.getStatus(key, true, {
        responseTime,
      });

      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: error instanceof Error ? error.message : 'Redis connection failed',
      });

      throw new HealthCheckError('Redis check failed', result);
    }
  }

  /**
   * Check Redis health with a simple status response (no error thrown)
   * Useful when Redis is optional
   */
  async checkStatus(
    key: string,
    queue: Queue | null,
    options: RedisHealthIndicatorOptions = {}
  ): Promise<HealthIndicatorResult> {
    if (!queue) {
      return this.getStatus(key, false, { message: 'Queue not configured' });
    }

    const timeout = options.timeout || 1000;
    const startTime = Date.now();

    try {
      const client = await queue.client;
      await Promise.race([
        client.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), timeout)
        ),
      ]);

      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        responseTime,
      });
    } catch (error) {
      return this.getStatus(key, false, {
        message: error instanceof Error ? error.message : 'Redis connection failed',
      });
    }
  }
}
