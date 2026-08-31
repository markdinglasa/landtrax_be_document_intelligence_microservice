import { SetMetadata } from '@nestjs/common';

export const AUDIT_DESCRIPTION_KEY = 'audit_description';

/**
 * Provides a human-readable description template for the API Gateway audit interceptor.
 */
export const AuditDescription = (template: string) => SetMetadata(AUDIT_DESCRIPTION_KEY, template);
