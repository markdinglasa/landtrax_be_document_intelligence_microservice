import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IS3Service } from './s3.service.abstract.js';
import { S3Service } from './s3.service.js';
import { ITextractService } from './textract.service.abstract.js';
import { TextractService } from './textract.service.js';
import { IBedrockService } from './bedrock.service.abstract.js';
import { BedrockService } from './bedrock.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    { provide: IS3Service, useClass: S3Service },
    { provide: ITextractService, useClass: TextractService },
    { provide: IBedrockService, useClass: BedrockService },
    S3Service,
    TextractService,
    BedrockService,
  ],
  exports: [
    IS3Service,
    ITextractService,
    IBedrockService,
    S3Service,
    TextractService,
    BedrockService,
  ],
})
export class AwsModule {}
