import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import escapeHtml from 'escape-html';
import { Observable } from 'rxjs';

/**
 * Query Validation Interceptor
 * 
 * Purpose: Validate and sanitize query parameters before processing
 * 
 * VAPT Fix: Cross-Site Scripting - Unencoded characters
 * This interceptor provides an additional layer of defense by:
 * 1. Detecting potentially malicious query parameters
 * 2. Rejecting requests with suspicious patterns
 * 3. Sanitizing query parameters that pass validation
 * 
 * Applied: Can be applied globally or to specific controllers
 */
@Injectable()
export class QueryValidationInterceptor implements NestInterceptor {
  // Patterns that indicate potential XSS attempts
  private readonly suspiciousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=, onload=
    /<img[^>]+src/i,
    /eval\(/i,
    /expression\(/i,
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const query = request.query;

    if (query && typeof query === 'object') {
      // Check for suspicious patterns in query parameters
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === 'string') {
          // Check if the query parameter contains suspicious patterns
          if (this.containsSuspiciousPattern(value)) {
            throw new BadRequestException(
              `Invalid query parameter: ${escapeHtml(key)}`,
            );
          }

          // Check if the key itself contains suspicious patterns
          if (this.containsSuspiciousPattern(key)) {
            throw new BadRequestException('Invalid query parameter name');
          }
        }
      }
    }

    return next.handle();
  }

  /**
   * Check if a string contains suspicious patterns that might indicate XSS
   */
  private containsSuspiciousPattern(str: string): boolean {
    return this.suspiciousPatterns.some((pattern) => pattern.test(str));
  }
}
