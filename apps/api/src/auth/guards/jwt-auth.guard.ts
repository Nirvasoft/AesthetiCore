import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        // Support token via query param (for <img> tags that can't set headers)
        const request = context.switchToHttp().getRequest();
        if (!request.headers.authorization && request.query?.token) {
            request.headers.authorization = `Bearer ${request.query.token}`;
        }

        return super.canActivate(context);
    }
}
