import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(private prisma: PrismaService) { }

    @Public()
    @Get()
    async check() {
        let dbStatus = 'ok';
        try {
            await this.prisma.tenant.count();

        } catch {
            dbStatus = 'error';
        }

        return {
            status: dbStatus === 'ok' ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                database: dbStatus,
                api: 'ok',
            },
        };
    }
}
