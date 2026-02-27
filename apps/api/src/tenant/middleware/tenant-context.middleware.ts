import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export interface TenantContext {
    tenantId: string;
    branchId: string | null;
}

declare global {
    namespace Express {
        interface Request {
            tenantContext?: TenantContext;
        }
    }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
    constructor(private prisma: PrismaService) { }

    async use(req: Request, _res: Response, next: NextFunction) {
        const user = (req as any).user;
        if (!user) return next(); // Let JwtAuthGuard handle unauthenticated

        const tenantId = user.tenantId;
        const branchId = user.branchId ?? null;

        if (!tenantId) {
            throw new UnauthorizedException('No tenant context in token');
        }

        req.tenantContext = { tenantId, branchId };
        next();
    }
}
