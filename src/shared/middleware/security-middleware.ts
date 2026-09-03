import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { SecurityConfig } from '../utils/security-config.js';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Apply security headers
    this.applySecurityHeaders(req, res);

    // Check IP whitelist/blacklist
    this.checkIPAccess(req, res);

    // Apply rate limiting
    this.applyRateLimiting(req, res);

    // Log security events
    this.logSecurityEvent(req);

    next();
  }

  private applySecurityHeaders(req: Request, res: Response) {
    const headers = SecurityConfig.SECURITY_HEADERS;

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  private checkIPAccess(req: Request, res: Response) {
    const ipWhitelist = SecurityConfig.IP_WHITELIST;

    if (!ipWhitelist.ENABLED) {
      return;
    }

    const clientIP = this.getClientIP(req);

    // Check blacklist
    if (ipWhitelist.BLOCKED_IPS.length > 0 && ipWhitelist.BLOCKED_IPS.includes(clientIP)) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    // Check whitelist
    if (ipWhitelist.ALLOWED_IPS.length > 0 && !ipWhitelist.ALLOWED_IPS.includes(clientIP)) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
  }

  private applyRateLimiting(req: Request, res: Response) {
    // This would be implemented with express-rate-limit
    // The actual rate limiting is handled by the ThrottlerModule
  }

  private logSecurityEvent(req: Request) {
    const clientIP = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Log suspicious activity
    if (this.isSuspiciousRequest(req)) {
      console.warn(`Suspicious request from ${clientIP}: ${req.method} ${req.url}`, {
        userAgent,
        headers: req.headers,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private isSuspiciousRequest(req: Request): boolean {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /<script/i, // XSS attempts
      /union\s+select/i, // SQL injection
      /eval\s*\(/i, // Code injection
      /javascript:/i, // JavaScript injection
    ];

    const url = req.url.toLowerCase();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();

    return suspiciousPatterns.some((pattern) => pattern.test(url) || pattern.test(userAgent));
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    )
      .split(',')[0]
      .trim();
  }
}

// Helmet configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.google.com', 'https://www.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting configuration
export const rateLimitConfig = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: SecurityConfig.RATE_LIMITS.GENERAL_API_PER_MINUTE,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.url === '/health' || req.url === '/status';
  },
});

// Login rate limiting
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Registration rate limiting
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: {
    error: 'Too many registration attempts, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiting
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
