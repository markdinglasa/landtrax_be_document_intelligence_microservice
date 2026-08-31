import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import appConfig from './config/typeorm/app-config';
import redisConfig from './config/redis-config';
import { getTypeOrmConfig } from './config/typeorm/config';

import { DashboardModule } from './domains/dashboard/dashboard.module';
import { ReportsModule } from './domains/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [appConfig, redisConfig],
    }),
    
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
            ...(isCluster ? { clusterRetryStrategy: (times) => Math.min(times * 50, 2000) } : {}),
            ...(useTls ? { tls: { rejectUnauthorized } } : {}),
          },
        };
      },
      inject: [ConfigService],
    }),

    DashboardModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
