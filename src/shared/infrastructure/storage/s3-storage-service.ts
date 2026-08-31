import { Injectable } from '@nestjs/common';

@Injectable()
export default class S3StorageService {
  async uploadFile(params: { file?: any; folder?: string; fileName?: string; buffer?: Buffer; key?: string; contentType?: string; }): Promise<{ key: string }> {
    throw new Error('S3StorageService not yet configured');
  }
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    throw new Error('S3StorageService not yet configured');
  }
}
