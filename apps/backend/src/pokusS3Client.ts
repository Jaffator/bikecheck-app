import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'node:fs';
import { BIKE_IMAGES_DIR } from './_config/path.js';
import path from 'node:path';
import 'dotenv/config';

console.log(process.env.CLOUDFLARE_SECRET_ACCESS_KEY);
const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://d768edddccfa863d2e6d32b278e3399a.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
  },
});

const upload = new Upload({
  client: S3,
  params: {
    Bucket: 'bikecheck',
    Key: 'bikes/350a8009-c403-470c-b6d5-f92cd4bf9ee8.jpg',
    Body: createReadStream(path.join(BIKE_IMAGES_DIR, '350a8009-c403-470c-b6d5-f92cd4bf9ee8.jpg')),
    ContentType: 'image/png',
  },
  leavePartsOnError: false,
});

upload.on('httpUploadProgress', (progress) => {
  console.log(`Uploaded ${progress.loaded ?? 0} bytes`);
});

const result = await upload.done();
console.log(`File uploaded successfully. Location: ${result.Key}`);
console.log(`Upload complete. ETag: ${result.ETag}`);
const url = `https://pub-4ee94249a97347858cdaf97e203e0980.r2.dev/bikes/350a8009-c403-470c-b6d5-f92cd4bf9ee8.jpg`;
