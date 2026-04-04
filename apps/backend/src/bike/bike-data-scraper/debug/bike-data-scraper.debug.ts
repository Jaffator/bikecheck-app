import 'dotenv/config';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BikeDataScrapeService } from '../bike-data-scraper.service';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import https from 'https';

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const logger = new PinoLogger({
    pinoHttp: {
      level: 'info',
      transport: {
        target: 'pino-loki',
        options: {
          host: 'http://localhost:3100', // Loki URL
          labels: { service: 'bike-scraper' },
          batching: true,
          interval: 5,
        },
      },
    },
  });
  logger.setContext(BikeDataScrapeService.name);

  try {
    // const bikeService = new BikeDataScrapeService(prisma, logger);
    // const result = await bikeService.searchBikeList('yeti sb160', '2024');
    // const components = await bikeService.externalGetBikeComponents(result[0].bikeUrl);
    // const filename = 'image1.jpg';
    // const filepath = path.join(__dirname, filename);
    // await downloadImage(result[1].image!, filepath);
    // const components = await bikeService.getBikeComponents(result[0].url);
  } finally {
    await prisma.onModuleDestroy();
  }
}

run().catch((err) => {
  console.error(err);
});

async function downloadImage(imageUrl: string, filepath: string) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    await fs.promises.writeFile(filepath, Buffer.from(response.data));
  } catch (error) {
    throw new Error(`download image failed ${error.message}`);
  }
}
