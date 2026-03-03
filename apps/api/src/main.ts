import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // No global prefix — DigitalOcean App Platform route '/api' already provides
  // the prefix and strips it before forwarding requests to this service.
  // Locally, the Vite dev proxy does the same (strips /api before forwarding).

  // CORS — in production allow any origin (frontend uses relative URLs on the
  // same domain); in development restrict to known local origins.
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : (process.env.NODE_ENV === 'production' ? true : ['http://localhost:5173', 'http://localhost:4200', 'http://localhost:4201']);
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('AesthetiCore API')
    .setDescription('Enterprise Aesthetic Clinic Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Health checks')
    .addTag('patients', 'Patient management')
    .addTag('sessions', 'Treatment sessions / EMR')
    .addTag('appointments', 'Booking & scheduling')
    .addTag('inventory', 'Product & stock management')
    .addTag('billing', 'Invoices & payments')
    .addTag('analytics', 'Reports & dashboard')
    .addTag('staff', 'Staff & HR')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 API running at: http://localhost:${port}`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
