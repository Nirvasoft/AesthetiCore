import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
    sub: string;      // user DB id
    email: string;
    role: string;
    tenantId: string;
    branchId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'dev_secret_change_me',
        });
    }

    async validate(payload: JwtPayload) {
        if (!payload.sub) throw new UnauthorizedException('Invalid token');
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            roles: [payload.role],   // array format for RolesGuard
            tenantId: payload.tenantId,
            branchId: payload.branchId ?? null,
        };
    }
}
