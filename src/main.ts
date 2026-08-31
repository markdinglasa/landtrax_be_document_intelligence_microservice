import { config } from 'dotenv';
process.env.TZ = 'Asia/Manila';
config({ path: ['.env'] });

import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  console.log(`Analytics & Reports Microservice running on port ${port}`);
}
bootstrap();
