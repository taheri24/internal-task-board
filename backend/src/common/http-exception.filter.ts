import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

/** Every error response uses: { statusCode, error, message, details?, requestId } */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'Something went wrong. Please try again.';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else {
        const b = body as { message?: string | string[]; error?: string };
        error = b.error ?? exception.name;
        if (Array.isArray(b.message)) {
          message = 'Validation failed';
          details = b.message;
        } else if (b.message) {
          message = b.message;
        }
      }
    } else {
      this.logger.error(`requestId=${requestId}`, exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({
      statusCode: status,
      error,
      message,
      ...(details ? { details } : {}),
      requestId,
    });
  }
}
