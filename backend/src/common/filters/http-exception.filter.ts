import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Support incoming correlation ID or generate a new unique UUID
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? exceptionResponse
          : { message: exceptionResponse };
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${correlationId}] Unexpected error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      // In production, do not leak internal system error details
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction ? 'An unexpected error occurred' : exception.message;
    }

    const errorPayload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId,
      error: typeof message === 'string' ? { message } : message,
    };

    response.setHeader('x-correlation-id', correlationId);
    response.status(status).json(errorPayload);
  }
}
