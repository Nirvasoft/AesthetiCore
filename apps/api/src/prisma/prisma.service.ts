import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private pool: pg.Pool;

    constructor() {
        const rawUrl = process.env.DATABASE_URL
            ?? 'postgresql://aestheticore:aestheticore_dev@localhost:5432/aestheticore';

        // pg driver treats sslmode=require as verify-full, rejecting self-signed certs.
        // Strip sslmode from URL and handle SSL purely via Pool config.
        const hasSsl = !rawUrl.includes('sslmode=disable');
        const connectionString = rawUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
        const pool = new pg.Pool({
            connectionString,
            ssl: hasSsl ? { rejectUnauthorized: false } : undefined,
        });
        const adapter = new PrismaPg(pool);

        super({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        });

        this.pool = pool;
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
        await this.pool.end();
    }
}
