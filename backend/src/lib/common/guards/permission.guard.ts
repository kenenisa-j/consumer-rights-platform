import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../../auth/auth.service';

/**
 * Common Permission Guard
 *
 * Enforces route authorization policies:
 * 1. Checks `@Public()`. If true, permits request without authentication.
 * 2. Checks required permissions via `@RequirePermission(...)`. If absent and not public, fails closed (403).
 * 3. Resolves Better Auth session from request headers. If missing/invalid, throws 401 Unauthorized.
 * 4. Queries live database for account status. If not ACTIVE, throws 403 Forbidden.
 * 5. Evaluates authenticated user permissions against required permissions (403 if insufficient).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const req = context.switchToHttp().getRequest<Request>();
    const headers = fromNodeHeaders(req.headers);

    // Resolve session via Better Auth API with authoritative database verification
    let sessionData;
    try {
      sessionData = await this.authService.auth.api.getSession({
        headers,
        query: { disableCookieCache: true },
      });
    } catch {
      sessionData = null;
    }

    if (!sessionData?.user || !sessionData?.session?.token) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required to access this resource.',
      });
    }

    // Authoritative database session verification: ensure session row exists and is not expired
    const dbSession = await this.prisma.session.findUnique({
      where: { token: sessionData.session.token },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (
      !dbSession ||
      dbSession.userId !== sessionData.user.id ||
      new Date(dbSession.expiresAt) <= new Date()
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required to access this resource.',
      });
    }

    // Query authoritative database record for live status and permissions
    const dbUser = await this.prisma.user.findUnique({
      where: { id: sessionData.user.id },
      select: {
        id: true,
        status: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dbUser || dbUser.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'User account is suspended or inactive.',
      });
    }

    const userPermissions: string[] = [];
    for (const userRole of dbUser.roles) {
      for (const rp of userRole.role.permissions) {
        userPermissions.push(rp.permission.code);
      }
    }

    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for this action.',
      });
    }

    // Attach verified user context to request
    (req as any).user = {
      id: dbUser.id,
      status: dbUser.status,
      permissions: userPermissions,
    };

    return true;
  }
}
