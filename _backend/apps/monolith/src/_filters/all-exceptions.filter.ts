/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';

interface ErrorBody {
  status: number;
  message: string;
}

// Global filter: turns Prisma + unexpected errors into clean HTTP responses
// and hides internal details (stack traces) from clients on 5xx.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const { status, message } = this.resolve(exception);

    // Only server errors are unexpected -> log the real cause for debugging.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(ctx.getRequest()),
      },
      status,
    );
  }

  private resolve(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const raw =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);
      return { status: exception.getStatus(), message: Array.isArray(raw) ? raw.join(', ') : raw };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrismaError(exception);
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): ErrorBody {
    switch (exception.code) {
      case 'P2002': // unique constraint
        return { status: HttpStatus.CONFLICT, message: 'Resource already exists' };
      case 'P2025': // record not found
        return { status: HttpStatus.NOT_FOUND, message: 'Resource not found' };
      case 'P2003': // foreign key constraint
        return { status: HttpStatus.BAD_REQUEST, message: 'Invalid reference' };
      default:
        return { status: HttpStatus.BAD_REQUEST, message: 'Database request error' };
    }
  }
}
