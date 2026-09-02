export abstract class IS3Service {
  /** Upload a file buffer to S3. */
  abstract uploadFile(key: string, body: Buffer, contentType: string): Promise<string>;

  /** Download a file from S3 as a Buffer. */
  abstract downloadFile(key: string): Promise<Buffer>;

  /** Generate a pre-signed URL for uploading. */
  abstract getUploadSignedUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;

  /** Generate a pre-signed URL for downloading. */
  abstract getDownloadSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /** Delete a file from S3. */
  abstract deleteFile(key: string): Promise<void>;
}
