import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Replaces GatewayUserGuard in the microservice.
 * The API Gateway already verified the JWT and injected x-user-id / x-user-role.
 * This guard ensures those headers are present and came from the trusted gateway.
 *
 * XSS/Header Injection Prevention:
 * - Validates x-gateway-secret matches APP_AUTH env var.
 * - If the secret is missing or wrong, rejects with 401 — so external callers
 *   who craft x-user-id headers directly cannot bypass authentication.
 * - x-user-id and x-user-role values are sanitized (stripped of HTML/script tags)
 *   before being attached to request.user to prevent any downstream injection.
 */
@Injectable()
export class GatewayUserGuard implements CanActivate {
  private readonly _logger = new Logger(GatewayUserGuard.name);
  private static readonly SANITIZE_PATTERN = /<[^>]*>|[<>"'`]/g;

  constructor(protected readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const gatewaySecret = request.headers['x-gateway-secret'];
    const expectedSecret = process.env.GATEWAY_SECRET;

    // Reject if gateway secret is missing or wrong — prevents header spoofing
    if (!gatewaySecret || gatewaySecret !== expectedSecret) {
      this._logger.warn(`Rejected request — invalid or missing x-gateway-secret from ${request.ip}`);
      throw new UnauthorizedException('Request must come through the API Gateway.');
    }

    const rawUserId = request.headers['x-user-id'];
    const rawUserRole = request.headers['x-user-role'];
    const rawUserType = request.headers['x-user-type'];

    if (!rawUserId) {
      throw new UnauthorizedException('Missing x-user-id header.');
    }

    // Sanitize all injected header values before attaching to request
    request.user = {
      id: this.sanitize(String(rawUserId)),
      role: this.sanitize(String(rawUserRole ?? '')),
      type: this.sanitize(String(rawUserType ?? '')),
    };

    return true;
  }

  private sanitize(value: string): string {
    return value.replace(GatewayUserGuard.SANITIZE_PATTERN, '').substring(0, 256);
  }
}
