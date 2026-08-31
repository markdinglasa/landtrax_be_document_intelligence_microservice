import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GatewayUserGuard } from './gateway-user.guard';

/**
 * Checks that the user (injected by GatewayUserGuard) has the required permission.
 * Permission matching is done against x-user-permissions header (comma-separated list)
 * injected by the API Gateway.
 */
@Injectable()
export class PermissionGuard extends GatewayUserGuard implements CanActivate {
  private readonly _permLogger = new Logger(PermissionGuard.name);

  constructor(reflector: Reflector) {
    super(reflector);
  }

  canActivate(context: ExecutionContext): boolean {
    super.canActivate(context); // validates gateway secret + injects request.user

    const request = context.switchToHttp().getRequest();
    const required =
      this.reflector.get<string>('permission', context.getHandler()) ??
      this.reflector.get<string[]>('anyPermission', context.getHandler());

    if (!required) return true; // no specific permission required

    const rawPermissions = request.headers['x-user-permissions'] ?? '';
    const permissions = new Set(
      String(rawPermissions)
        .split(',')
        .map((p) => p.trim()),
    );

    const requiredArr = Array.isArray(required) ? required : [required];
    const hasPermission = requiredArr.some((p) => permissions.has(p));

    if (!hasPermission) {
      this._permLogger.warn(
        `Permission denied for user ${request.user?.id}. Required: ${requiredArr.join(',')}`,
      );
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}
