import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): string {
    return 'Document Intelligence Microservice is healthy!';
  }
}