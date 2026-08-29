import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import sharp, { type ResizeOptions } from 'sharp';
import { Readable } from 'stream';
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

// The garage frames every bike photo at 2:1. A photo picked from the device is
// cropped to that ratio in the app before it is sent, but a scraped product shot
// arrives in whatever ratio the manufacturer published — squarish, most of the
// time. Filling the frame with it would cut the wheels and bars off the bike, so
// it is letterboxed into the frame on the same white instead.
const FRAME_ASPECT = 2;

// Said the same way however the read failed to find the file, so a caller cannot tell a
// missing key from a key it was never allowed to ask for.
const MISSING_OBJECT = 'Attachment not found in storage';

// One stored object, read back. The length is whatever storage reported, which it does
// not always do - and a missing one is not a reason to guess.
export interface StoredFile {
  body: Readable;
  contentLength: number | null;
}

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
   * @param letterbox - Pad the image into the 2:1 bike frame instead of leaving
   * its own ratio, for photos the app never got to crop
   * @returns Public URL of the uploaded file
   */
  async uploadImageR2CloudFare(imageBuffer: Buffer, cloudFolder: CloudFolder, letterbox = false): Promise<string> {
    try {
      const optimised = await sharp(imageBuffer)
        // Applies the EXIF orientation and drops the tag, so a photo taken on a
        // phone is not left on its side once the metadata is gone.
        .rotate()
        .resize(letterbox ? await this.frameFit(imageBuffer) : { width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
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

  /**
   * Read one stored object back. Everything else here writes; a Report needs the read
   * side so it can serve its own attachments rather than hand a stranger the storage
   * address behind them - see ADR 0013.
   * @param key - The object's key inside the bucket, as stored on the report snapshot
   * @returns The bytes as a stream, with the length when storage reports one
   */
  async downloadFileR2CloudFare(key: string): Promise<StoredFile> {
    let body: unknown;
    let contentLength: number | undefined;

    try {
      const response = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: key }));
      body = response.Body;
      contentLength = response.ContentLength;
    } catch (error) {
      // A key the bucket does not hold is a missing file. Anything else - credentials,
      // network, a bucket that is not there - is this server's fault, and saying 404
      // would send the caller looking in the wrong place.
      if (this.isMissingObject(error)) {
        throw new NotFoundException(MISSING_OBJECT);
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Storage read failed: ${message}`);
    }

    if (!(body instanceof Readable)) {
      throw new NotFoundException(MISSING_OBJECT);
    }

    return { body, contentLength: contentLength ?? null };
  }

  /**
   * The key an upload is stored under, taken back out of the address it is served from.
   * The write path builds that address from the public origin and the key, so this is its
   * inverse - and it lives here, beside it, rather than in whichever domain needs a key.
   * @param url - A stored file's public URL, as recorded when it was uploaded
   * @returns The object's key inside the bucket
   */
  storageKeyFromUrl(url: string): string {
    const origin = process.env.CLOUDFLARE_PUBLIC_URL;
    if (origin !== undefined && origin !== '' && url.startsWith(origin)) {
      return url.slice(origin.length).replace(/^\/+/, '');
    }

    // Served from some other origin, or already a bare key. The path is the key either
    // way, so a file uploaded before the origin changed is still found.
    try {
      return new URL(url).pathname.replace(/^\/+/, '');
    } catch {
      return url.replace(/^\/+/, '');
    }
  }

  // R2 and S3 both say 404 for a key that is not there, under a handful of error names.
  private isMissingObject(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const name = (error as { name?: string }).name;
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;

    return name === 'NoSuchKey' || name === 'NotFound' || status === 404;
  }

  /**
   * Size the 2:1 frame to the image being padded into it. `withoutEnlargement`
   * cannot be used here - with `fit: contain` it shrinks the canvas along with
   * the image and the padding is lost - so the frame is capped by the source
   * width instead, and a small product shot is never blown up to 1600px.
   * @param imageBuffer - The image about to be letterboxed
   * @returns Resize options covering the whole frame
   */
  private async frameFit(imageBuffer: Buffer): Promise<ResizeOptions> {
    const { width } = await sharp(imageBuffer).metadata();
    const frameWidth = Math.min(IMAGE_MAX_WIDTH, width ?? IMAGE_MAX_WIDTH);

    return {
      width: frameWidth,
      height: Math.round(frameWidth / FRAME_ASPECT),
      fit: 'contain',
      background: IMAGE_BACKGROUND,
    };
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
