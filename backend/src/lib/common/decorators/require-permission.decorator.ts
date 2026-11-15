import { applyDecorators, SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require one or more specific permissions to access a handler.
 * Format: `<module>.<action>[.<scope>]` (e.g. 'complaints.read.own', 'complaints.inspect.office').
 * Attaches both PERMISSIONS_KEY ('permissions') for PermissionGuard and
 * 'requirePermission' for compatibility with reflection assertions.
 */
export const RequirePermission = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata('requirePermission', permissions),
  );
