import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { reports } from '@prisma/client';
import { ReportService } from './report.service';
import { ReportAttachmentFile, ReportSnapshot } from './report.types';
import { ExportReportDto } from './dto/export-report.dto';
import { ResponseExportedReportDto, ResponseReportDto } from './dto/response-report.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

// What the page asks for when it is being drawn for print rather than read.
const PRINT_VARIANT = '1';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ---------- POST export a report ----------
  @ApiOperation({ summary: 'Export a report and read it back for preview' })
  @ApiResponse({ status: 201, type: ResponseExportedReportDto })
  @Post('export')
  async exportReport(
    @CurrentUser('userId') userId: string,
    @Body() dto: ExportReportDto,
  ): Promise<ResponseExportedReportDto> {
    const { report, snapshot } = await this.reportService.exportReport(Number(userId), dto);
    return { ...this.toDto(report), snapshot };
  }

  // ---------- GET the reports the caller has made ----------
  // Metadata only, newest first. The bike filter is what the bike detail page arrives with,
  // so the owner is not hunting through every link they ever made.
  @ApiOperation({ summary: 'List the reports the caller has made, newest first' })
  @ApiQuery({ name: 'bikeId', type: Number, required: false })
  @ApiResponse({ status: 200, type: ResponseReportDto, isArray: true })
  @Get('mine')
  async listMine(
    @CurrentUser('userId') userId: string,
    @Query('bikeId', new ParseIntPipe({ optional: true })) bikeId?: number,
  ): Promise<ResponseReportDto[]> {
    const reportsList = await this.reportService.listMine(Number(userId), bikeId);
    return reportsList.map((report) => this.toDto(report));
  }

  // ---------- PATCH publish a report ----------
  @ApiOperation({ summary: 'Open a report to the world' })
  @ApiResponse({ status: 200, type: ResponseReportDto })
  @Patch(':id/publish')
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: string,
  ): Promise<ResponseReportDto> {
    const report = await this.reportService.publish(id, Number(userId));
    return this.toDto(report);
  }

  // ---------- PATCH revoke a report link ----------
  @ApiOperation({ summary: 'Revoke a report link, for good' })
  @ApiResponse({ status: 200, type: ResponseReportDto })
  @Patch(':id/revoke')
  async revoke(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: string,
  ): Promise<ResponseReportDto> {
    const report = await this.reportService.revoke(id, Number(userId));
    return this.toDto(report);
  }

  // ---------- DELETE discard a report that was never published ----------
  @ApiOperation({ summary: 'Discard a report nobody has seen' })
  @ApiResponse({ status: 200, type: ResponseReportDto })
  @Delete(':id')
  async discard(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: string,
  ): Promise<ResponseReportDto> {
    const report = await this.reportService.discard(id, Number(userId));
    return this.toDto(report);
  }

  // ---------- GET public report by token (no auth) ----------
  @Public()
  @ApiOperation({ summary: 'Public view of a report by its share token' })
  @ApiResponse({ status: 200 })
  @Get('public/:token')
  async getPublic(@Param('token') token: string, @Query('print') print?: string): Promise<ReportSnapshot> {
    // The print variant is the server drawing the page for a file, not a reader opening
    // it, so the same document is read without counting a view.
    return await this.reportService.getPublicSnapshot(token, print !== PRINT_VARIANT);
  }

  // ---------- GET the report as an A4 PDF (no auth) ----------
  // One request launches a browser, so this route is held well below the global limit.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @ApiOperation({ summary: 'Print a published report to an A4 PDF' })
  @ApiResponse({ status: 200 })
  @Get('public/:token/pdf')
  async getPublicPdf(@Param('token') token: string): Promise<StreamableFile> {
    const file = await this.reportService.publicPdf(token);
    const encoded = encodeURIComponent(file.filename);

    return new StreamableFile(file.body, {
      type: 'application/pdf',
      disposition: `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      length: file.body.length,
    });
  }

  // ---------- GET one attachment behind a share link (no auth) ----------
  @Public()
  @ApiOperation({ summary: 'Stream one attachment of a published report' })
  @ApiResponse({ status: 200 })
  @Get('public/:token/attachment/:attachmentId')
  async getPublicAttachment(
    @Param('token') token: string,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ): Promise<StreamableFile> {
    const attachment = await this.reportService.publicAttachment(token, attachmentId);
    return this.stream(attachment);
  }

  // ---------- GET one attachment of the caller's own report ----------
  @ApiOperation({ summary: "Stream one attachment of the caller's own report" })
  @ApiResponse({ status: 200 })
  @Get(':id/attachment/:attachmentId')
  async getOwnedAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser('userId') userId: string,
  ): Promise<StreamableFile> {
    const attachment = await this.reportService.ownedAttachment(id, Number(userId), attachmentId);
    return this.stream(attachment);
  }

  // Wraps what the service read for the transport. The filename is given twice: the
  // percent-encoded form every browser understands, and the plain one so a Czech receipt
  // keeps its diacritics where UTF-8 filenames are supported.
  private stream(attachment: ReportAttachmentFile): StreamableFile {
    const encoded = encodeURIComponent(attachment.name);

    return new StreamableFile(attachment.body, {
      type: attachment.contentType,
      disposition: `inline; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      length: attachment.contentLength ?? undefined,
    });
  }

  // Maps a report row to the lightweight DTO (without the heavy snapshot).
  private toDto(report: reports): ResponseReportDto {
    return {
      id: report.id,
      public_token: report.public_token,
      share_url: this.reportService.shareUrl(report.public_token),
      kind: report.kind,
      bike_id: report.bike_id,
      covers: this.reportService.covers(report),
      is_public: report.is_public,
      view_count: report.view_count,
      last_viewed_at: report.last_viewed_at,
      revoked: report.revoked,
      expires_at: report.expires_at,
      created_at: report.created_at,
    };
  }
}
