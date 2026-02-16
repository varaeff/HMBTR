import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface NestErrorResponse {
  message?: string | string[];
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as Error).message || 'Unknown error';

    let errorField: unknown = exceptionResponse;
    let detailsField: unknown = undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as NestErrorResponse;
      errorField = res.error || 'Error';
      detailsField = res.message;
    }

    const finalResponse: Record<string, unknown> = {
      error: errorField,
      timestamp: new Date().toISOString(),
    };

    if (detailsField) {
      finalResponse.details = detailsField;
    }

    response.status(status).json(finalResponse);
  }
}
