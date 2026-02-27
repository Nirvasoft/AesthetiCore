import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/decorators/roles.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // If JwtAuthGuard already validated the user, populate tenantContext
        // (middleware can't do this because it runs before guards)
        if (user?.tenantId && !request.tenantContext) {
            request.tenantContext = {
                tenantId: user.tenantId,
                branchId: user.branchId ?? null,
                userId: user.sub,
            };
        }

        return !!request.tenantContext?.tenantId;
    }
}
