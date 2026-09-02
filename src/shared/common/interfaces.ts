import { IncomingMessage } from 'node:http';
import UserEntity from '../infrastructure/database/entities/user.entity.js';

export interface LoggerRequest extends IncomingMessage {
  user: UserEntity;
}

export interface TokenPayload {
  userId?: string;
  sub?: string;
  type?: string;
  tv?: number;
}

/**
 * Augmented Express Request with authenticated user and cookies.
 * Using Express's Request ensures headers are typed as IncomingHttpHeaders where `authorization?: string` exists.
 */
export interface RequestWithUser extends Request {
  user: UserEntity;
  cookies: Record<string, string>;
}

export interface CustomRequest extends Request {
  ip: string;
  userAgent: string;
  get(header: string): string | undefined;
  headers: any;
  cookies?: any;
  user?: { id: string };
  auditMetadata?: Record<string, string>;
  originalUrl?: string;
}
