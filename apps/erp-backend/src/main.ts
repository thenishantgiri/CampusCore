import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import logger from './common/logger/pino.logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription('ERP Backend API Documentation')
    .setVersion('1.0')
    .addTag('auth')
    .addTag('users')
    .addTag('roles')
    .addTag('permissions')
    .addBearerAuth() // Adds Bearer authentication option
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.info(`🚀 ERP backend started on http://localhost:${port}`);
  logger.info(
    `📝 API Documentation available at http://localhost:${port}/api-docs`,
  );
}
bootstrap();
