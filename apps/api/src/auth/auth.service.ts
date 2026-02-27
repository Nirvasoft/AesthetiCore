import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findFirst({
            where: { email, isActive: true },
            include: { branch: true, tenant: true },
        });

        if (!user) throw new UnauthorizedException('Invalid credentials');

        // In production: compare hashed password stored on user record
        const isValid = await bcrypt.compare(password, user.passwordHash ?? '');
        if (!isValid) throw new UnauthorizedException('Invalid credentials');

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId,
        };

        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
                branchId: user.branchId,
            },
        };
    }
}
