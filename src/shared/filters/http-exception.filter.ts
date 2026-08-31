import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import escapeHtml from 'escape-html';
import { Response } from 'express';

/**
 * Global exception filter to sanitize error messages and prevent XSS attacks
 * This filter intercepts all HTTP exceptions and sanitizes any user input
 * that might be reflected in error messages (e.g., invalid URLs, query params)
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error: string | string[] = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // VAPT Fix: Categorical 404 handling to prevent reflected XSS (SOC Critical Finding)
      // All 404 responses return a generic message — no URL/path reflection
      // Updated: 2026-03-25 - Replaced fragile regex matching with status-based approach
      if (status === HttpStatus.NOT_FOUND) {
        message = 'Resource not found';
        error = 'Not Found';
      } else if (typeof exceptionResponse === 'string') {
        message = this.sanitizeMessage(exceptionResponse);
        error = 'Error';
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = this.sanitizeMessage(responseObj.message || message);
        error = this.sanitizeMessage(responseObj.error || 'Error');
      }
    } else {
      // Log unhandled exceptions to ensure they appear in the error logs
      console.error('Unhandled Exception Caught by Filter:', exception);
    }

    // Get origin from request for CORS
    const origin = request.headers?.origin;
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'https://elodgement-staging.lares.com.ph',
          'https://elodgement-uat.lares.com.ph',
          'https://elodgement-dev.lares.com.ph',
          'https://elodgement.lares.com.ph',
          'https://ltrxdev.questsrv.com',
          'https://ltrx.questsrv.com',
          'https://ltrxdev-be.questsrv.com',
          'https://ltrx-be.questsrv.com',
          'https://elodgement.landtrax.ph',
        ];

    // Set CORS headers on error responses
    if (response.headersSent) {
      // Headers have already been sent (e.g. during an SSE stream).
      // We cannot modify headers or send a JSON body.
      return response.end();
    }

    if (!origin || allowedOrigins.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin || '*');
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,app-version');
    }

    // Add security headers to error responses to satisfy WAS scanners and provide Defense in Depth
    // VAPT Fix: Comprehensive security headers on all error responses (403, 404, 500, etc.)
    // Updated: 2026-03-11 - Added all required security headers for VAPT compliance
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; sandbox;");
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=*, payment=(), usb=()');

    // Return sanitized response
    response.status(status).json({
      statusCode: status,
      error: error,
      message: message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Sanitize message to prevent XSS attacks
   * Removes or encodes potentially dangerous characters and patterns
   */
  private sanitizeMessage(message: string | string[]): string | string[] {
    if (Array.isArray(message)) {
      return message.map((msg) => this.sanitizeString(msg));
    }
    return this.sanitizeString(message);
  }

  /**
   * Sanitize a single string by HTML escaping dangerous characters
   */
  private sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return String(str);
    }
    return escapeHtml(str);
  }
}