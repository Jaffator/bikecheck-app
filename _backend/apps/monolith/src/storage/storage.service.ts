import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import path from 'path';
import 'dotenv/config';

// Service attachments are receipts and invoices, kept apart from the bike photos so a
// document is never served from the folder the garage reads.
type CloudFolder = 'bikes' | 'service-attachments';

// One size for every use. Wide enough to stay sharp full-screen on a phone at
// 3x, small enough that a card does not pull megabytes to draw 180px.
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_QUALITY = 80;
// Scraped product photos arrive two ways: transparent PNGs, and JPEGs with a
// white studio background already baked into the pixels. WebP keeps the alpha of
// the first kind, so the same garage showed some bikes on white and others on
// whatever surface was behind them. White is the only colour that can match both
// — the baked-in kind cannot be recoloured, so the transparent kind is flattened
// to meet it. The frontend paints the same white behind these images.
const IMAGE_BACKGROUND = '#FFFFFF';

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
      console.log('OK UPLOAD TO CLOUDFARE');
      console.log(`FINAL URL${process.env.CLOUDFARE_PUBLIC_URL}/${key}`);
      return `${process.env.CLOUDFLARE_PUBLIC_URL}/${key}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Storage upload failed: ${message}`);
    }
  }
  /**
   * Normalise an image and upload it. Phone cameras produce multi-megabyte
   * originals in whatever format the device prefers (HEIC included), which the
   * app then has to download in full to draw a 180px card. One size serves
   * every use: cards, detail and full-screen alike, and every stored image is
   * opaque so a transparent original cannot pick up the surface behind it.
   * @param imageBuffer - The image as received, in any format sharp can read
   * @param cloudFolder - Cloud folder to upload to (e.g. 'bikes')
   * @returns Public URL of the uploaded file
   */
  async uploadImageR2CloudFare(imageBuffer: Buffer, cloudFolder: CloudFolder): Promise<string> {
    try {
      const optimised = await sharp(imageBuffer)
        // Applies the EXIF orientation and drops the tag, so a photo taken on a
        // phone is not left on its side once the metadata is gone.
        .rotate()
        .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
        // No-op on an image that has no alpha, so device photos are untouched.
        .flatten({ background: IMAGE_BACKGROUND })
        .webp({ quality: IMAGE_QUALITY })
        .toBuffer();

      return await this.uploadFileR2CloudFare(optimised, `${randomUUID()}.webp`, cloudFolder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Image processing failed: ${message}`);
    }
  }

  /**
   * Store a PDF exactly as it arrived. Unlike a photo there is nothing to resize or
   * re-encode - a receipt is already as small as it is going to get, and rewriting it
   * would risk losing the very thing it is kept as proof of.
   * @param fileBuffer - The PDF as received
   * @param cloudFolder - Cloud folder to upload to (e.g. 'service-attachments')
   * @returns Public URL of the uploaded file
   */
  async uploadPdfR2CloudFare(fileBuffer: Buffer, cloudFolder: CloudFolder): Promise<string> {
    return await this.uploadFileR2CloudFare(fileBuffer, `${randomUUID()}.pdf`, cloudFolder);
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
