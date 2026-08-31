import { Injectable, NestMiddleware } from '@nestjs/common';
import escapeHtml from 'escape-html';
import { NextFunction, Request, Response } from 'express';

/**
 * Sanitization Middleware
 *
 * Purpose: Prevent XSS attacks by rejecting malicious input early and
 * sanitizing all incoming request data before it reaches routing or controllers.
 *
 * VAPT Fix: Cross-Site Scripting - Unencoded characters (SOC Critical Finding)
 * Updated: 2026-03-25
 *
 * Defense-in-depth strategy:
 * 1. FAIL EARLY — Reject requests containing known XSS attack patterns (returns 400)
 * 2. SANITIZE — HTML-encode remaining dangerous characters in URL, query, params, body
 *
 * This middleware runs BEFORE NestJS route matching, ensuring malicious requests
 * are blocked at the input validation level and never reach the routing pipeline.
 *
 * Applied: Globally via AppModule.configure() before route handlers
 */
@Injectable()
export class SanitizationMiddleware implements NestMiddleware {
  // XSS attack patterns to reject immediately (fail-fast)
  // These patterns indicate intentional attack attempts, not legitimate input
  private readonly xssPatterns: RegExp[] = [
    /<script/i,
    /<\/script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<svg[\s/]/i,
    /javascript:/i,
    /vbscript:/i,
    /\bon\w+\s*=/i, // Event handlers only at word boundary: onclick=, onload=, onerror=
    /eval\s*\(/i,
    /expression\s*\(/i,
    // data: URI in CSS url()
    /url\s*\(\s*(?:['"]\s*)?data:/i,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    // ──────────────────────────────────────────────────────────────
    // STEP 1: FAIL EARLY — Reject requests with XSS attack patterns
    // SOC Requirement: Block malicious input at the middleware level
    // before it reaches the NestJS routing pipeline
    // ──────────────────────────────────────────────────────────────
    const rawUrl = req.originalUrl || req.url || '';
    const decodedUrl = this.safeDecodeURI(rawUrl);

    if (this.containsXssPattern(decodedUrl)) {
      res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Request rejected: potentially malicious input detected',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ──────────────────────────────────────────────────────────────
    // STEP 2: SANITIZE — HTML-encode remaining dangerous characters
    // Defense-in-depth: even if patterns slip through, encode them
    // ──────────────────────────────────────────────────────────────
    // NOTE: We intentionally do NOT escapeHtml(req.url) or req.originalUrl
    // because escapeHtml converts '&' to '&amp;', which breaks query string
    // parsing (e.g., '&limit=30' becomes 'amp;limit=30').
    // The fail-fast rejection (Step 1) already blocks malicious URLs,
    // and HttpExceptionFilter categorically replaces 404 messages.

    // Sanitize query parameters in-place
    if (req.query && typeof req.query === 'object') {
      this.sanitizeInPlace(req.query);
    }

    // Sanitize URL parameters in-place
    if (req.params && typeof req.params === 'object') {
      this.sanitizeInPlace(req.params);
    }

    // Sanitize request body in-place
    if (req.body && typeof req.body === 'object') {
      this.sanitizeInPlace(req.body);
    }

    next();
  }

  /**
   * Check if a string contains known XSS attack patterns
   */
  private containsXssPattern(input: string): boolean {
    return this.xssPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Safely decode a URI, returning the original string if decoding fails
   * This ensures encoded payloads like %3Cscript%3E are also caught
   */
  private safeDecodeURI(uri: string): string {
    try {
      return decodeURIComponent(uri);
    } catch {
      return uri;
    }
  }

  /**
   * Sanitize an object in-place by HTML-escaping all string values recursively
   */
  private sanitizeInPlace(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        this.sanitizeProperty(obj, key);
      }
    }
  }

  /**
   * Helper to sanitize a specific property of an object
   */
  private sanitizeProperty(obj: any, key: string): void {
    const value = obj[key];

    if (typeof value === 'string') {
      obj[key] = this.sanitizeString(value);
    } else if (Array.isArray(value)) {
      this.sanitizeArray(value);
    } else {
      this.sanitizeInPlace(value);
    }
  }

  /**
   * Helper to sanitize elements within an array
   */
  private sanitizeArray(arr: any[]): void {
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof item === 'string') {
        arr[i] = this.sanitizeString(item);
      } else {
        this.sanitizeInPlace(item);
      }
    }
  }

  /**
   * Sanitize a string by HTML-escaping dangerous characters
   * Encodes: < > " ' & to prevent XSS
   */
  private sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }
    return escapeHtml(str);
  }
}
