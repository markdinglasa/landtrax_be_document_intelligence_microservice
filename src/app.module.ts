// @ts-ignore
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { getTypeOrmConfig } from './config/app.config.js';
import awsConfig from './config/aws.config.js';
import redisConfig from './config/redis.config.js';
import { AwsModule } from './shared/infrastructure/aws/aws.module.js';
import { OcrModule } from './domains/ocr/ocr.module.js';
import { ReconciliationModule } from './domains/reconciliation/reconciliation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [redisConfig, awsConfig],
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getTypeOrmConfig(configService),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isCluster = configService.get<boolean>('redis.cluster', false);
        const useTls = configService.get<boolean>('redis.tls', false);
        const rejectUnauthorized = configService.get<boolean>('redis.tlsRejectUnauthorized', true);

        return {
          connection: {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
            password: configService.get<string>('redis.password'),
            ...(isCluster
              ? { clusterRetryStrategy: (times: number) => Math.min(times * 50, 2000) }
              : {}),
            ...(useTls ? { tls: { rejectUnauthorized } } : {}),
          },
        };
      },
      inject: [ConfigService],
    }),

    AwsModule,
    OcrModule,
    ReconciliationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
