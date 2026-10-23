import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  const corsOrigins = configService.get<string[]>('corsOrigins') || [];
  const isProduction = configService.get<boolean>('isProduction');

  // Disable X-Powered-By fingerprinting on underlying Express instance
  const expressInstance = app.getHttpAdapter().getInstance();
  if (expressInstance && typeof expressInstance.disable === 'function') {
    expressInstance.disable('x-powered-by');
  }

  // Apply Security Headers (HSTS, CSP, nosniff, frame-ancestors, Permissions-Policy)
  app.use(new SecurityHeadersMiddleware().use);

  // Enable graceful shutdown hooks for container lifecycle / zero-downtime restarts
  app.enableShutdownHooks();

  // Set global API prefix
  app.setGlobalPrefix(apiPrefix);

  // Configure CORS with production origin enforcement
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : isProduction ? false : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global filters, interceptors, and validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GauShilp OS API')
    .setDescription(
      'Multi-tenant e-commerce SaaS API for artisans, gaushalas, and traditional handmade goods sellers.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);
  logger.log(`🚀 GauShilp OS Backend running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📖 API Documentation available at http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
