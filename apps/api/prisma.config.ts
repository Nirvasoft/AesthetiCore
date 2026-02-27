import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// Load .env from the monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
    datasource: {
        url: process.env['DATABASE_URL'] ?? 'postgresql://postgres:pgadmin@localhost:5433/aestheticore',
    },
});
