/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import seedData from './data.json';

type ModelsData = {
  brand: string;
  models: string[];
};

export class SeedBike {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  private async bike_brands(data: string[]): Promise<void> {
    try {
      const result = await this.prisma.bike_brands.createMany({
        data: data.map((bike_brand: string) => ({ bike_brand })),
        skipDuplicates: true,
      });
      console.log(`✅ bike_brands - seeded OK, inserted: ${result.count}`);
    } catch (error) {
      if (error instanceof Error) throw new Error('🛑 Failed to seed bike brands', { cause: error.message });
    }
  }

  private async bike_sizes(data: string[]): Promise<void> {
    try {
      const [deleted, result] = await this.prisma.$transaction([
        this.prisma.bike_sizes.deleteMany({}),
        this.prisma.bike_sizes.createMany({
          data: data.map((size: string) => ({ size })),
          skipDuplicates: true,
        }),
      ]);
      //   console.log(`✅ bike_sizes - cleared: ${deleted.count}`);
      console.log(`✅ bike_sizes - seeded OK, inserted: ${result.count}`);
    } catch (error) {
      throw new Error('Failed to seed bike sizes', { cause: error });
    }
  }

  private async wheel_size(data: string[]): Promise<void> {
    try {
      const [deleted, result] = await this.prisma.$transaction([
        this.prisma.wheel_sizes.deleteMany({}),
        this.prisma.wheel_sizes.createMany({
          data: data.map((size: string) => ({ size })),
          skipDuplicates: true,
        }),
      ]);
      //   console.log(`✅ wheel_sizes - cleared: ${deleted.count}`);
      console.log(`✅ wheel_sizes - seeded OK, inserted: ${result.count}`);
    } catch (error) {
      throw new Error('Failed to seed wheel sizes', { cause: error });
    }
  }

  private async bike_types(data: string[]): Promise<void> {
    try {
      const [deleted, result] = await this.prisma.$transaction([
        this.prisma.bike_types.deleteMany({}),
        this.prisma.bike_types.createMany({
          data: data.map((type: string) => ({ type })),
          skipDuplicates: true,
        }),
      ]);
      //   console.log(`bike_types - cleared: ${deleted.count}`);
      console.log(`✅ bike_types - seeded OK, inserted: ${result.count}`);
    } catch (error) {
      throw new Error('Failed to seed bike_types', { cause: error });
    }
  }

  private async ride_styles(data: string[]): Promise<void> {
    try {
      const [deleted, result] = await this.prisma.$transaction([
        this.prisma.ride_styles.deleteMany({}),
        this.prisma.ride_styles.createMany({
          data: data.map((ride_style: string) => ({ ride_style })),
          skipDuplicates: true,
        }),
      ]);
      //   console.log(`✅ ride_styles - cleared: ${deleted.count}`);
      console.log(`✅ ride_styles - seeded OK, inserted: ${result.count}`);
    } catch (error) {
      throw new Error('Failed to seed ride_styles', { cause: error.message });
    }
  }

  private async bike_models(data: ModelsData[]): Promise<void> {
    try {
      // await this.prisma.bike_models.deleteMany({});
      for (const model of data) {
        const brandID = await this.prisma.bike_brands.findFirst({
          where: { bike_brand: model.brand },
          select: { id: true },
        });
        const databulk = model.models.map((model) => ({ brand_id: brandID!.id, model_name: model }));
        await this.prisma.bike_models.createMany({
          data: databulk,
          skipDuplicates: true,
        });
      }
    } catch (error) {
      throw new Error('Failed to seed bike_models', { cause: error.message });
    }
  }

  async runSeedBike() {
    await this.bike_brands(seedData.bike_brands);
    await this.bike_sizes(seedData.bike_sizes);
    await this.wheel_size(seedData.wheel_sizes);
    await this.bike_types(seedData.bike_types);
    await this.ride_styles(seedData.ride_styles);
    await this.bike_models(seedData.bike_models);
  }
}

//   async downloadBikeBrands(): Promise<void> {
//     const brands = (await this.prisma.bike_brands.findMany({})).map((obj) => obj.bike_brand);
//     await fs.writeFile(
//       path.join(currentDirPath, 'brands.json'),
//       JSON.stringify({ bike_brands: brands }, null, 2),
//       'utf-8',
//     );
//   }

// main().catch((error: unknown) => {
//   if (error instanceof Error) {
//     console.error(error.message);
//     return;
//   }
//   console.error('Unknown error', error);
// });

// async checkBrand(): Promise<void> {
//     const brands = (await this.prisma.bike_brands.findMany({})).map((brand) => brand.bike_brand);

//     const bikeModels = (data as { bike_models: Array<{ brand: string }> }).bike_models;
//     const brandsjson = bikeModels.map((model) => model.brand);
//     const matchBrandDb = bikeModels
//       .filter(({ brand }) => brands.find((brandDB) => brandDB === brand))
//       .map((model) => model.brand);

//     for (const brand of brandsjson) {
//       if (!matchBrandDb.includes(brand)) {
//         console.log(brand, brands.includes(brand));
//         const res = await this.prisma.bike_brands.findMany({
//           where: {
//             bike_brand: {
//               contains: brand,
//             },
//           },
//         });
//         if (res.length) {
//           await this.prisma.bike_brands.update({
//             data: { bike_brand: brand },
//             where: { id: res[0].id },
//           });
//         } else {
//           await this.prisma.bike_brands.create({
//             data: { bike_brand: brand },
//           });
//         }

//         console.log('Obashuje alespon cast?', res);
//       }
//     }
//     console.log(matchBrandDb.length);
//     console.log(brandsjson.length);
//   }
