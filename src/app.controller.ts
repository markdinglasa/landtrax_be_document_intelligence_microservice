import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): string {
    return this.appService.getHealth();
  }

  @Get('test-ocr')
  testOCR(): { message: string; status: HttpStatus } {
    return { message: 'OCR test successful', status: HttpStatus.OK };
  }
}
