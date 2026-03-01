import path from 'node:path';
import { defineConfig } from 'prisma/config';

// In production, DATABASE_URL is injected as an env var by the hosting platform.
// In development, try to load from .env at the monorepo root.
if (process.env.NODE_ENV !== 'production') {
    try {
        const dotenv = require('dotenv');
        dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    } catch {
        // dotenv not available — that's fine in production
    }
}

export default defineConfig({
    datasource: {
        url: process.env['DATABASE_URL'] ?? 'postgresql://postgres:pgadmin@localhost:5433/aestheticore',
    },
});
