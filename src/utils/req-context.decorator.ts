import {
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { decode } from 'jsonwebtoken';
import { CustomRequest } from '../shared/common/index.js';

export class RequestContextDto {
  ip!: string;
  userAgent!: string;
  userId!: string;
  auditMetadata?: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  user?: { id: string; sessionEvictionAt?: Date; isGracePeriodSession?: boolean };
  originalUrl?: string;
}

export const ReqContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestContextDto => {
    try {
      const request = ctx.switchToHttp().getRequest<CustomRequest>();

      const envAppVersion: string = process.env.APP_VERSION || '0.0.0.0';
      const appVersion = request.headers['app-version'];

      // Only check version if it's provided and not in development mode
      if (appVersion && appVersion !== envAppVersion && envAppVersion !== '0.0.0.0') {
        throw new HttpException(
          {
            message: 'Please refresh to update version.',
            error: `Version ${envAppVersion} required`,
          },
          HttpStatus.NOT_ACCEPTABLE,
        );
      }

      const ipAddress =
        (request as any).ip || (request as any).connection?.remoteAddress || '127.0.0.1';
      if (!ipAddress) {
        throw new HttpException('IP address is required', HttpStatus.BAD_REQUEST);
      }

      const userAgent = request.headers['user-agent'] || 'Unknown';
      if (!userAgent) {
        throw new HttpException('User agent is required', HttpStatus.BAD_REQUEST);
      }

      let token: string | undefined;
      const cookieHeader = request.headers?.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }

      // decode the token and get the user
      const decodedToken = token ? (decode(token) as { sub: string; exp?: string }) : null;
      if (!decodedToken && token) {
        throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
      }

      const userId = request.user?.id || decodedToken?.sub;

      if (!userId) {
        throw new NotFoundException('User not found in request');
      }

      console.log('user-id:', userId, ' user-agent:', userAgent, ' ip-address:', ipAddress);

      const ctxObj = {
        ip: ipAddress,
        userAgent,
        userId,
        cookies: request?.cookies,
        user: request?.user,
        headers: request?.headers,
      } as RequestContextDto;

      Object.defineProperty(ctxObj, 'auditMetadata', {
        get() {
          return request.auditMetadata;
        },
        set(value: Record<string, string>) {
          request.auditMetadata = value || data;
        },
        enumerable: true,
        configurable: true,
      });

      return ctxObj;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new Error('INTERNAL_SERVER_ERROR' + (error as Error).message);
    }
  },
);
