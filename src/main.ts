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

  const isKafkaEnabled = process.env.KAFKA_ENABLED !== 'false';

  if (isKafkaEnabled) {
    const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: kafkaBrokers,
          clientId: process.env.KAFKA_CLIENT_ID || 'document-intelligence-microservice',
          retry: {
            retries: 10,
            initialRetryTime: 300,
            maxRetryTime: 5000,
          },
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID || 'document-intelligence-consumer',
          allowAutoTopicCreation: true,
        },
        subscribe: {
          fromBeginning: false,
        },
      },
    });
  }

  try {
    await app.startAllMicroservices();
  } catch (error: unknown) {
    console.warn(
      `Warning: Failed to start one or more microservice transports: ${(error as Error)?.message}`,
    );
  }

  await app.listen(httpPort);

  console.log(
    `Document Intelligence Microservice running on HTTP port ${httpPort} and TCP port ${tcpPort}`,
  );
}

void bootstrap();
