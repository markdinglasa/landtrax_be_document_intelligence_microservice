import { HttpStatus, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing headers
 * Registered in AppModule via MiddlewareConsumer
 */
export default class CORSMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const API_URL = String(process.env.FRONTEND_URL);

    // Add all allowed origins here
    const ALLOWED_ORIGINS = [API_URL];

    if (process.env.APP_ENV === 'dev') {
      ALLOWED_ORIGINS.push('http://localhost:3000');
    }
    // Get the origin from the request
    const origin = req.header('origin');
    const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);

    if (isAllowedOrigin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }

    // Set CORS headers
    //res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Allow-Origin, Access-Control-Allow-Credentials, Access-Control-Allow-Methods, Access-Control-Allow-Headers, app-version',
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.status(HttpStatus.NO_CONTENT).end();
      return;
    }

    next();
  }
}
