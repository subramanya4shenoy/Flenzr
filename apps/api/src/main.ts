import { ConfigService } from "@nestjs/config";
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      credentials: true,
      origin: ['http://localhost:3000', 'http://ec2-15-207-111-18.ap-south-1.compute.amazonaws.com:3000'],
    },
  });
  app.useGlobalPipes(new ValidationPipe());
  const config = app.get(ConfigService);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3333;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`Running in ${config.get("environment")} mode`);
}

bootstrap();
