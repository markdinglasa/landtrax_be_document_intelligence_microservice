import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DashboardModule } from './domains/dashboard/dashboard.module';
import { ReportsModule } from './domains/reports/reports.module';

@Module({
  imports: [
    DashboardModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}