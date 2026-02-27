import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';

@Module({})
export class TenantModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantContextMiddleware)
            .exclude({ path: 'health', method: RequestMethod.GET })
            .forRoutes('*');
    }
}
