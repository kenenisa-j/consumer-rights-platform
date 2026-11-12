import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

/**
 * Common Permission Guard
 *
 * Enforces route authorization policies:
 * 1. Checks if handler or class has `@Public()`. If true, permits request.
 * 2. Checks required permissions via `@RequirePermission(...)`. If absent and not public, fails closed.
 * 3. Evaluates authenticated user permissions against required permissions.
 *
 * NOTE (Better Auth Integration Boundary - Phase 3):
 * Session extraction, cookie verification, and active membership derivation
 * (portal, role, office level, jurisdiction) will be wired into this guard in Phase 3.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Fail closed: endpoints without `@Public()` or `@RequirePermission(...)` are denied
    if (!requiredPermissions || requiredPermissions.length === 0) {
      throw new ForbiddenException({
        code: 'POLICY_REQUIRED',
        message: 'Access denied: no explicit permission policy declared on this endpoint.',
      });
    }

    // Phase 3 boundary: Inspect authenticated request context
    const request = context.switchToHttp().getRequest<{
      user?: {
        id?: string;
        permissions?: string[];
      };
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required to access this resource.',
      });
    }

    const userPermissions = user.permissions ?? [];
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for this action.',
      });
    }

    return true;
  }
}
