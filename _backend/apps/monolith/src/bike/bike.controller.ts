import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import path from 'path';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { BikeService } from './bike.service';
import { BikeDataScrapeService } from './bike-data-scraper/bike-data-scraper.service';
import { CreateBikeDto, CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ApiResponse, ApiBody, ApiQuery, ApiConsumes, ApiExtraModels } from '@nestjs/swagger';
import { SearchBikeExternalResponseDto, ResponseBikeDto, NewBikeFormDataDto } from './dto/response-bike.dto';
import { AssembleBikeComponentsDto } from '../component/dto/response-components';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
// import { NewBikeFormData } from './types/bike.types';

// The create body is declared as a raw multipart schema, so these DTOs are no
// longer reachable from any decorator - listed here so the generated OpenAPI
// schema (and the frontend types built from it) still contains them.
@ApiExtraModels(CreateBikeWithComponentsDto, CreateBikeDto)
@Controller('bike')
export class BikeController {
  constructor(
    private readonly bikeService: BikeService,
    private readonly searchBikeExternalService: BikeDataScrapeService,
    @InjectPinoLogger(BikeController.name) private readonly logger: PinoLogger,
  ) {}

  // ---------- POST Create new bike with componenets - image as  URL or uploaded file ----------
  // Multipart: "data" holds the JSON DTO as a string, "image" is the optional uploaded photo.
  @Post('/create')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'CreateBikeWithComponentsDto serialized as JSON' },
        image: { type: 'string', format: 'binary' },
      },
      required: ['data'],
    },
  })
  @ApiResponse({ status: 201, type: ResponseBikeDto })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      // Only guards the transfer: the image is resized before it is stored, so
      // this caps what a phone may upload rather than what is kept.
      limits: { fileSize: 15 * 1024 * 1024 },
      // Phones send HEIC/HEIF and, through Capacitor, often no usable mime type
      // at all - a blob read back from a webPath arrives as octet-stream. So the
      // extension decides whenever the mime type is not an image one.
      fileFilter: (_req, file, callback) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.avif'];
        const extension = path.extname(file.originalname).toLowerCase();

        if (file.mimetype.startsWith('image/') || allowedExtensions.includes(extension)) {
          callback(null, true);
          return;
        }
        callback(new BadRequestException(`Unsupported image type: ${file.mimetype || extension || 'unknown'}`), false);
      },
    }),
  )
  async createBike(
    @CurrentUser('userId') userId: string,
    @Body('data') data: string,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<ResponseBikeDto> {
    const dto = await this.parseCreateBikeDto(data);
    return await this.bikeService.createBikeWithComponents(Number(userId), dto, image);
  }

  // ---------- GET External Bike List ----------
  @Get('/external')
  @ApiResponse({ status: 200, type: SearchBikeExternalResponseDto, isArray: true })
  @ApiQuery({ name: 'bikeName', type: String })
  @ApiQuery({ name: 'year', type: String })
  async searchBikeExternal(
    @Query('bikeName') bikeName: string,
    @Query('year') year: string,
  ): Promise<SearchBikeExternalResponseDto[]> {
    console.log('Searching for external bikes with name:', bikeName, 'and year:', year);
    return this.searchBikeExternalService.searchBikeList(bikeName, year);
  }

  // ---------- GET External Bikes Of One Collection ----------
  @Get('/external/family')
  @ApiResponse({ status: 200, type: SearchBikeExternalResponseDto, isArray: true })
  @ApiQuery({ name: 'url', type: String })
  async searchFamilyExternal(@Query('url') url: string): Promise<SearchBikeExternalResponseDto[]> {
    return await this.searchBikeExternalService.searchFamilyList(url);
  }

  // ---------- GET Search External Bike components ----------
  @Get('/external/components')
  @ApiResponse({ status: 200, type: AssembleBikeComponentsDto, isArray: true })
  @ApiQuery({ name: 'bikeUrl', type: String })
  async searchComponentsExternal(@Query('bikeUrl') bikeUrl: string): Promise<AssembleBikeComponentsDto[]> {
    return await this.searchBikeExternalService.externalGetBikeComponents(bikeUrl);
  }

  // ---------- GET bike form options ----------
  @Get('/form-options')
  @ApiResponse({ status: 200, type: NewBikeFormDataDto })
  async formOptions(): Promise<NewBikeFormDataDto> {
    return await this.bikeService.getFormOptions();
  }

  // ---------- GET current user's bikes ----------
  @Get()
  @ApiResponse({ status: 200, type: ResponseBikeDto, isArray: true })
  findUserBikes(@CurrentUser('userId') userId: string): Promise<ResponseBikeDto[]> {
    return this.bikeService.findByUser(Number(userId));
  }

  // ---------- GET bike by ID ----------
  @Get(':id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  findBike(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<ResponseBikeDto> {
    return this.bikeService.findByID(+id, Number(userId));
  }

  // ---------- UPDATE bike by ID ----------
  @Patch(':id')
  @ApiBody({ type: UpdateBikeDto })
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateBikeDto: UpdateBikeDto,
  ): Promise<ResponseBikeDto> {
    return this.bikeService.update(+id, Number(userId), updateBikeDto);
  }

  // ---------- DELETE soft bike by ID ----------
  @Delete('/delsoft/:id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  deleteSoft(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<ResponseBikeDto> {
    return this.bikeService.deleteSoft(+id, Number(userId));
  }

  // ---------- DELETE hard bike by ID ----------
  @Delete('/delhard/:id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  deleteHard(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<ResponseBikeDto> {
    return this.bikeService.deleteHard(+id, Number(userId));
  }

  // Multipart fields arrive as strings, so the global ValidationPipe is bypassed here.
  private async parseCreateBikeDto(data: string): Promise<CreateBikeWithComponentsDto> {
    if (!data) {
      throw new BadRequestException('Missing "data" field');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new BadRequestException('Field "data" is not valid JSON');
    }

    const dto = plainToInstance(CreateBikeWithComponentsDto, parsed);
    const errors = await validate(dto);

    if (errors.length > 0) {
      // Raw ValidationError objects are deeply nested and unreadable on the
      // client, so they are flattened to "field: reason" lines instead.
      const messages = flattenValidationErrors(errors);
      this.logger.warn(`Rejected bike create: ${messages.join('; ')}`);
      throw new BadRequestException({ message: messages, error: 'Validation failed' });
    }

    return dto;
  }
}

// "bike.total_km: total_km must not be less than 0" - the path says which field,
// including the index of the offending component.
function flattenValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((reason) => `${path}: ${String(reason)}`);
    return [...own, ...flattenValidationErrors(error.children ?? [], path)];
  });
}
// // ---------- Create new bike with componenets - Upload image ----------
// @Post('/create/with-image')
// @ApiBody({ type: CreateBikeWithComponentsDto })
// @ApiResponse({ status: 201, type: ResponseBikeDto })
// @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
// async create(@Body('data') data: string) {
//   const dto = JSON.parse(data) as CreateBikeWithComponentsDto;
//   return this.bikeService.createBikeWithComponents(dto);
// }
