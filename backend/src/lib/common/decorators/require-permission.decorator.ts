import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require one or more specific permissions to access a handler.
 * Format: `<module>.<action>[.<scope>]` (e.g. 'complaints.read.own', 'complaints.inspect.office').
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
