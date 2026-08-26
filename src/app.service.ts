import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): string {
    return 'Analytics and Reports Microservice is healthy!';
  }
}