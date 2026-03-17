import 'dotenv/config';
import pino from 'pino';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../shared/prisma.service';
import { BikeDataScrapeService } from './bike-data-scraper.service';
import { validateHeaderName } from 'node:http';

async function run() {
  console.log('before service init');

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
    const bikeService = new BikeDataScrapeService(prisma, logger);
    const result = await bikeService.findBikeList({ brand: 'Trek', model: 'Domane', year: '2020' });
    const components = await bikeService.getBikeComponents(result[0].url);
    console.log('action');
  } finally {
    await prisma.onModuleDestroy();
  }
}

run().catch((err) => {
  console.error(err);
});
