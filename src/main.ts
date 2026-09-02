import { config } from 'dotenv';
process.env.TZ = 'Asia/Manila';
config({ path: ['.env'] });

import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const httpPort = Number(process.env.PORT) || 5006;
  const tcpPort = Number(process.env.TCP_PORT) || 5016;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  await app.startAllMicroservices();
  await app.listen(httpPort);

  console.log(
    `Document Intelligence Microservice running on HTTP port ${httpPort} and TCP port ${tcpPort}`,
  );
}

void bootstrap();
