import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateBikeDto, CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ResponseBikeDto, NewBikeFormDataDto } from './dto/response-bike.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import 'dotenv/config';
import { Prisma, bikes } from '@prisma/client';

@Injectable()
export class BikeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectPinoLogger(BikeService.name) private readonly logger: PinoLogger,
  ) {}

  // bike.service.ts
  async getFormOptions(): Promise<NewBikeFormDataDto> {
    const [types, brands, models] = await Promise.all([
      this.prisma.bike_types.findMany({
        select: { type: true },
      }),
      this.prisma.bike_brands.findMany({
        select: { bike_brand: true, id: true },
      }),
      this.prisma.bike_models.findMany({
        select: { model_name: true, brand_id: true },
      }),
    ]);

    return {
      bikeTypes: types.map((t) => t.type).filter((type): type is string => type !== null),
      bikeBrands: brands,
      bikeModels: models,
    };
  }

  async createBikeWithComponents(
    userId: number,
    createBikeData: CreateBikeWithComponentsDto,
    image?: Express.Multer.File,
  ): Promise<ResponseBikeDto> {
    let imageUrl = createBikeData.bike.image_url;
    console.log('Image URL BEFORE:', imageUrl);
    if (image) {
      // Photo uploaded from the device
      imageUrl = await this.storeFile(image);
    } else if (imageUrl && !imageUrl.includes(process.env.CLOUDFLARE_PUBLIC_URL!)) {
      // Photo provided as an external URL (not already stored in our cloud)
      imageUrl = await this.storeFileFromUrl(imageUrl);
      console.log('Image URL after storing from external URL:', imageUrl);
    }
    // The client sends the type by name, so it is resolved to a row here - both
    // the bike and its default intervals are keyed off it.
    const { bike_type: bikeTypeName, ...bikeFields } = createBikeData.bike;
    const bikeType = bikeTypeName ? await this.prisma.bike_types.findUnique({ where: { type: bikeTypeName } }) : null;

    if (bikeTypeName && !bikeType) {
      throw new NotFoundException(`Bike type "${bikeTypeName}" not found`);
    }

    // Ownership comes from the authenticated user, never from the request body.
    // Fork Basic Service, Fork Full Service, Shock Basic Service, Shock Full Service
    const bikeToSave: Prisma.bikesUncheckedCreateInput = {
      ...bikeFields,
      user_id: userId,
      image_url: imageUrl,
      bike_type_id: bikeType?.id,
    };
    return await this.prisma.$transaction(async (db) => {
      // 1.create a new Bike
      const bike = await db.bikes.create({ data: { ...bikeToSave } });

      // 2.create mounted components for the bike
      const validComponents = createBikeData.components.filter((c) => c.component_type_id !== undefined);
      const componentData = validComponents.map((data) => ({
        ...data,
        bike_id: bike.id,
        component_type_id: data.component_type_id,
      }));
      await db.components_mounted.createMany({ data: componentData });

      // 3. copy default intervals based on bike type for newly created bike
      const eventFilter: Prisma.events_actionWhereInput = {};
      if (!bike.has_front_suspension) eventFilter.req_front_suspension = false;
      if (!bike.has_rear_suspension) eventFilter.req_rear_suspension = false;
      // The intervals are seeded per bike type, so a bike without one has nothing
      // to copy - it is still created, and the intervals follow once its type is
      // known.
      if (bikeType?.type) {
        const defaultIntervals = await db.default_service_intervals.findMany({
          where: {
            category: { has: bikeType.type },
            events_action: eventFilter,
          },
        });

        await db.bike_service_interval.createMany({
          data: defaultIntervals.map((interval) => ({
            bike_id: bike.id,
            event_actions_id: interval.event_actions_id,
            service_interval_km: interval.service_interval_km,
            service_interval_min: interval.service_interval_min,
            health_index_interval: interval.health_index_interval,
          })),
        });
      } else {
        this.logger.warn(`Bike ${bike.id} created without a bike type - no default service intervals copied`);
      }

      return toBikeDto(bike);
    });
  }

  // Deleted bikes stay in the table so their rides and service history survive,
  // which means every read has to exclude them or they come back to the garage.
  async findAll(): Promise<ResponseBikeDto[]> {
    const bikes = await this.prisma.bikes.findMany({ where: { is_deleted: { not: true } }, include: bikeInclude });
    return bikes.map(toBikeDto);
  }

  async findByUser(userId: number): Promise<ResponseBikeDto[]> {
    const bikes = await this.prisma.bikes.findMany({
      where: { user_id: userId, is_deleted: { not: true } },
      include: bikeInclude,
    });
    return bikes.map(toBikeDto);
  }

  async findByID(id: number, userId: number): Promise<ResponseBikeDto> {
    return this.findOwnedBike(id, userId);
  }

  // Corrects a bike the caller owns. The client sends the type by name and the photo as a
  // file, exactly as create does, so both are resolved here rather than by the caller. Only
  // the fields that arrived are written: a form that did not ask about a field must never
  // blank it.
  async update(
    id: number,
    userId: number,
    updateBikeDto: UpdateBikeDto,
    image?: Express.Multer.File,
  ): Promise<ResponseBikeDto> {
    await this.findOwnedBike(id, userId);

    const { bike_type: bikeTypeName, ...bikeFields } = updateBikeDto;
    const data: Prisma.bikesUncheckedUpdateInput = { ...bikeFields };

    if (bikeTypeName !== undefined) {
      const bikeType = await this.prisma.bike_types.findUnique({ where: { type: bikeTypeName } });
      if (!bikeType) {
        throw new NotFoundException(`Bike type "${bikeTypeName}" not found`);
      }
      data.bike_type_id = bikeType.id;
    }

    if (image) {
      const imageUrl = await this.storeFile(image);
      // A failed upload leaves the photo the bike already has; the rest of the form still
      // saves, so the owner does not lose what they typed to a storage outage.
      if (imageUrl) {
        data.image_url = imageUrl;
      }
    }

    return toBikeDto(await this.prisma.bikes.update({ where: { id }, data, include: bikeInclude }));
  }

  async deleteSoft(id: number, userId: number): Promise<ResponseBikeDto> {
    await this.findOwnedBike(id, userId);
    return toBikeDto(
      await this.prisma.bikes.update({
        where: { id },
        data: { is_deleted: true, deleted_at: new Date() },
        include: bikeInclude,
      }),
    );
  }

  async deleteHard(id: number, userId: number): Promise<ResponseBikeDto> {
    await this.findOwnedBike(id, userId);
    return toBikeDto(await this.prisma.bikes.delete({ where: { id }, include: bikeInclude }));
  }

  // Returns the bike only if it belongs to the user; otherwise 404 (no ownership leak).
  private async findOwnedBike(id: number, userId: number): Promise<ResponseBikeDto> {
    const bike = await this.prisma.bikes.findFirst({
      where: { id, user_id: userId, is_deleted: { not: true } },
      include: bikeInclude,
    });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return toBikeDto(bike);
  }

  // Uploads a photo received as FILE to cloud storage.
  private async storeFile(image: Express.Multer.File): Promise<string | undefined> {
    try {
      return await this.storageService.uploadImageR2CloudFare(image.buffer, 'bikes');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload image to cloud: ${message}`);
      return undefined; // Return undefined to indicate failure
    }
  }
  // Uploads a photo received as an EXTERNAL URL to cloud storage.
  private async storeFileFromUrl(url: string): Promise<string | undefined> {
    const response = await fetch(url);

    if (!response.ok) {
      this.logger.error({ custom: true }, `Failed to download file: ${response.statusText}`);
      return undefined; // Return undefined to indicate failure
    }
    try {
      const file = await response.arrayBuffer();
      // Nothing cropped this one to the frame the garage draws, so it is padded into it.
      return await this.storageService.uploadImageR2CloudFare(Buffer.from(file), 'bikes', true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload image to cloud: ${message}`);
      return undefined; // Return undefined to indicate failure
    }
  }
}

// Every bike read carries its type row, so the response can name the type rather than hand
// out an id the client has no way to resolve.
const bikeInclude = { bike_types: true } satisfies Prisma.bikesInclude;

type BikeRow = bikes & { bike_types?: { type: string | null } | null };

// Prisma hands a Decimal column back as a Decimal object, which serialises as neither a
// number nor anything a client can do arithmetic on. Costs are narrowed the same way, so
// the weight follows them rather than inventing a second convention.
function toBikeDto(bike: BikeRow): ResponseBikeDto {
  const { bike_types, ...fields } = bike;
  return {
    ...fields,
    bike_weight_kg: bike.bike_weight_kg === null ? null : Number(bike.bike_weight_kg),
    bike_type: bike_types?.type ?? null,
  };
}
