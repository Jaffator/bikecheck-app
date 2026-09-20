import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiProduces, ApiResponse } from '@nestjs/swagger';
import { PreviewService } from './preview.service';
import { Public } from '../auth/decorators/public.decorator';

const HTML = 'text/html; charset=utf-8';
// Off takes effect on the next request, so the document is never kept; the image URL
// carries its version, so the image is kept for good.
const NO_STORE = 'no-store';
const IMMUTABLE = 'public, max-age=31536000, immutable';

// One request transcodes a photo, so these routes sit well below the global limit - as the Report PDF.
const IMAGE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

// Caddy rewrites /u/* and /r/* here: the SPA shell with the page's Open Graph block in <head>,
// the same document for people and crawlers. Every route is public and counts no view.
@Controller('preview')
export class PreviewController {
  constructor(private readonly previewService: PreviewService) {}

  // ---------- GET the garage shell ----------
  @Public()
  @ApiOperation({ summary: "The SPA shell with a Public Profile's garage card in <head>; neutral when closed" })
  @ApiProduces(HTML)
  @ApiResponse({ status: 200 })
  @Header('Content-Type', HTML)
  @Header('Cache-Control', NO_STORE)
  @Get('u/:handle')
  async garageShell(@Param('handle') handle: string): Promise<string> {
    return await this.previewService.garageShell(handle);
  }

  // ---------- GET the garage card ----------
  // Declared before the bike shell, or `image.jpg` would be read as a bike id.
  @Throttle(IMAGE_THROTTLE)
  @Public()
  @ApiOperation({ summary: 'The garage card: the first Shared Bike with a photo, 1200x630 JPEG' })
  @ApiProduces('image/jpeg')
  @ApiResponse({ status: 200 })
  @Header('Cache-Control', IMMUTABLE)
  @Get('u/:handle/image.jpg')
  async garageImage(@Param('handle') handle: string): Promise<StreamableFile> {
    return this.jpeg(await this.previewService.garageImage(handle));
  }

  // ---------- GET the bike shell ----------
  @Public()
  @ApiOperation({ summary: "The SPA shell with one bike's card in <head>; neutral when closed" })
  @ApiProduces(HTML)
  @ApiResponse({ status: 200 })
  @Header('Content-Type', HTML)
  @Header('Cache-Control', NO_STORE)
  @Get('u/:handle/:bikeId')
  async bikeShell(@Param('handle') handle: string, @Param('bikeId') bikeId: string): Promise<string> {
    return await this.previewService.bikeShell(handle, Number(bikeId));
  }

  // ---------- GET the bike card ----------
  @Throttle(IMAGE_THROTTLE)
  @Public()
  @ApiOperation({ summary: "One bike's card: its photo letterboxed to 1200x630 JPEG" })
  @ApiProduces('image/jpeg')
  @ApiResponse({ status: 200 })
  @Header('Cache-Control', IMMUTABLE)
  @Get('u/:handle/:bikeId/image.jpg')
  async bikeImage(@Param('handle') handle: string, @Param('bikeId') bikeId: string): Promise<StreamableFile> {
    return this.jpeg(await this.previewService.bikeImage(handle, Number(bikeId)));
  }

  // ---------- GET the report shell ----------
  @Public()
  @ApiOperation({ summary: "The SPA shell with a Report's card in <head>; neutral once the link is closed" })
  @ApiProduces(HTML)
  @ApiResponse({ status: 200 })
  @Header('Content-Type', HTML)
  @Header('Cache-Control', NO_STORE)
  @Get('r/:token')
  async reportShell(@Param('token') token: string): Promise<string> {
    return await this.previewService.reportShell(token);
  }

  // ---------- GET the report card ----------
  @Throttle(IMAGE_THROTTLE)
  @Public()
  @ApiOperation({ summary: "A Report's card: the frozen bike photo letterboxed to 1200x630 JPEG" })
  @ApiProduces('image/jpeg')
  @ApiResponse({ status: 200 })
  @Header('Cache-Control', IMMUTABLE)
  @Get('r/:token/image.jpg')
  async reportImage(@Param('token') token: string): Promise<StreamableFile> {
    return this.jpeg(await this.previewService.reportImage(token));
  }

  // ---------- GET the neutral card ----------
  @Throttle(IMAGE_THROTTLE)
  @Public()
  @ApiOperation({ summary: 'The neutral BikeCheck card every closed page points at' })
  @ApiProduces('image/jpeg')
  @ApiResponse({ status: 200 })
  @Header('Cache-Control', IMMUTABLE)
  @Get('image.jpg')
  async neutralImage(): Promise<StreamableFile> {
    return this.jpeg(await this.previewService.neutralImage());
  }

  // Served as bytes, not a redirect: no crawler documents following one on an image.
  private jpeg(body: Buffer): StreamableFile {
    return new StreamableFile(body, { type: 'image/jpeg', length: body.length });
  }
}
