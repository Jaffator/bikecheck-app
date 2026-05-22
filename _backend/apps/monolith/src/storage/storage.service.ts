import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import 'dotenv/config';

type CloudFolder = 'bikes';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.CLOUDFLARE_BUCKET_NAME || 'bikecheck';
  }

  /**
   * Upload file to R2 storage
   * @param fileBuffer - Buffer of the file to upload
   * @param filename - File name to upload
   * @param cloudFolder - Cloud folder to upload to (e.g. 'bikes')
   * @returns Public URL of the uploaded file
   */
  async uploadFileR2CloudFare(fileBuffer: Buffer, filename: string, cloudFolder: CloudFolder): Promise<string> {
    const contentType = this.getContentType(filename);

    try {
      const key = `${cloudFolder}/${filename}`;

      const response = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
        }),
      );

      if (response.$metadata.httpStatusCode !== 200) {
        throw new InternalServerErrorException('Failed to upload file to storage');
      }

      return `${process.env.CLOUDFARE_PUBLIC_URL}/${key}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Storage upload failed: ${message}`);
    }
  }
  private getContentType(url: string): string {
    const ext = path.extname(url).toLowerCase();
    const map: Record<string, string> = {
      '.webp': 'image/webp',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return map[ext] || 'application/octet-stream';
  }
}

// const storage = new StorageService();
// const url = await storage.uploadFile(
//   BIKE_IMAGES_DIR,
//   'd91bab0b-8161-4a4f-aa6d-6b1a5bf18e7f.jpg',
//   'bikes',
//   'image/jpeg',
// );
// console.log(url);
