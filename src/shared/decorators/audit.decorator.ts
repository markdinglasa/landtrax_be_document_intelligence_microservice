import { SetMetadata } from '@nestjs/common';

export const AUDIT_RESOURCE_KEY = 'audit_resource';

/**
 * Marks a controller or handler with the resource name for the API Gateway audit interceptor.
 */
export const Audit = (resource: string) => SetMetadata(AUDIT_RESOURCE_KEY, resource);
