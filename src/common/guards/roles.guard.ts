import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isPublicRoute = !requiredRoles || requiredRoles.length === 0;
    if (isPublicRoute) return true;

    // Requires AuthGuard('jwt') to run first and populate request.user.
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}