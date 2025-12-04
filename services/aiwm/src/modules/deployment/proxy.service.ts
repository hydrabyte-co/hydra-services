import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';

/**
 * ProxyService - HTTP Proxy for deployment endpoints
 * Handles proxying requests to model inference endpoints
 */
@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  /**
   * Proxy an HTTP request to target URL
   * Preserves method, headers, body, query params
   * Streams response back to client
   */
  async proxyRequest(
    targetUrl: string,
    req: Request,
    res: Response,
    options?: { timeout?: number; method?: string }
  ): Promise<void> {
    const startTime = Date.now();
    const method = options?.method || req.method;

    this.logger.log(`Proxying ${method} request to ${targetUrl}`);

    try {
      // Make request to target endpoint
      const response = await axios({
        method: method as any,
        url: targetUrl,
        data: req.body,
        headers: this.sanitizeHeaders(req.headers),
        params: req.query,
        timeout: options?.timeout || 300000, // 5 minutes default
        responseType: 'stream',
        validateStatus: () => true, // Accept all status codes
        maxRedirects: 5,
      });

      // Log success
      const duration = Date.now() - startTime;
      this.logger.log(
        `Proxy succeeded: ${method} ${targetUrl} - Status: ${response.status} - Duration: ${duration}ms`
      );

      // Forward response to client
      this.forwardResponse(response, res);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Proxy failed: ${method} ${targetUrl} - Error: ${error.message} - Duration: ${duration}ms`
      );

      // Handle proxy errors
      this.handleProxyError(error, res);
    }
  }

  /**
   * Fetch JSON data from target URL
   * Used for API spec and health checks
   */
  async fetchJson(
    targetUrl: string,
    options?: { timeout?: number }
  ): Promise<any> {
    this.logger.log(`Fetching JSON from ${targetUrl}`);

    try {
      const response = await axios.get(targetUrl, {
        timeout: options?.timeout || 10000, // 10 seconds default
        validateStatus: (status) => status < 500, // Accept 4xx but not 5xx
      });

      return response.data;

    } catch (error: any) {
      this.logger.error(`Failed to fetch JSON from ${targetUrl}: ${error.message}`);
      throw this.mapProxyError(error);
    }
  }

  /**
   * Sanitize request headers
   * Remove headers that shouldn't be forwarded
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized = { ...headers };

    // Remove hop-by-hop headers
    delete sanitized['host'];
    delete sanitized['connection'];
    delete sanitized['keep-alive'];
    delete sanitized['transfer-encoding'];
    delete sanitized['upgrade'];
    delete sanitized['content-length']; // Will be recalculated

    // Remove sensitive headers
    delete sanitized['authorization']; // Don't forward auth to model endpoint
    delete sanitized['cookie'];

    return sanitized;
  }

  /**
   * Forward response from target to client
   * Preserves status code and headers
   */
  private forwardResponse(response: AxiosResponse, res: Response): void {
    // Forward status code
    res.status(response.status);

    // Forward headers
    const headersToForward = { ...response.headers };

    // Remove hop-by-hop headers
    delete headersToForward['connection'];
    delete headersToForward['keep-alive'];
    delete headersToForward['transfer-encoding'];

    Object.entries(headersToForward).forEach(([key, value]) => {
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    });

    // Stream response body
    response.data.pipe(res);
  }

  /**
   * Handle proxy errors and send appropriate response
   */
  private handleProxyError(error: any, res: Response): void {
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({
        statusCode: 502,
        message: 'Endpoint is not reachable',
        error: 'Bad Gateway',
      });
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      res.status(504).json({
        statusCode: 504,
        message: 'Request timeout',
        error: 'Gateway Timeout',
      });
    } else if (error.response) {
      // Forward error response from target endpoint
      res.status(error.response.status).json({
        statusCode: error.response.status,
        message: error.response.data?.message || error.response.statusText,
        error: error.response.statusText,
        details: error.response.data,
      });
    } else {
      res.status(502).json({
        statusCode: 502,
        message: error.message || 'Proxy request failed',
        error: 'Bad Gateway',
      });
    }
  }

  /**
   * Map proxy error to appropriate NestJS exception
   */
  private mapProxyError(error: any): Error {
    if (error.code === 'ECONNREFUSED') {
      return new Error('ENDPOINT_UNREACHABLE');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new Error('ENDPOINT_TIMEOUT');
    } else if (error.response?.status === 404) {
      return new Error('RESOURCE_NOT_FOUND');
    } else if (error.response?.status >= 400 && error.response?.status < 500) {
      return new Error(`CLIENT_ERROR: ${error.response.statusText}`);
    } else {
      return new Error(`PROXY_ERROR: ${error.message}`);
    }
  }
}
