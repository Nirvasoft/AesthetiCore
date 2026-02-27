import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
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
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 API running at: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
