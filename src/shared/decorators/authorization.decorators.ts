import { SetMetadata } from '@nestjs/common';

/** Requires the user to have a specific permission (injected by gateway) */
export const PermissionRequired = (permission: string) => SetMetadata('permission', permission);

/** Requires the user to have any one of the specified permissions */
export const AnyPermission = (...permissions: string[]) => SetMetadata('anyPermission', permissions);

/** Rate limited decorator */
export const RateLimited = (limit = 100, windowMs = 900000) =>
  SetMetadata('rateLimit', { limit, windowMs });
