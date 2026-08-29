import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { reports } from '@prisma/client';
import { ReportService } from './report.service';
import { ReportAttachmentFile, ReportSnapshot } from './report.types';
import { ExportReportDto } from './dto/export-report.dto';
import { ResponseExportedReportDto, ResponseReportDto } from './dto/response-report.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

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

  // ---------- GET all reports for the current user ----------
  @ApiOperation({ summary: 'List all reports for the current user' })
  @ApiResponse({ status: 200, type: ResponseReportDto, isArray: true })
  @Get('mine')
  async listMine(@CurrentUser('userId') userId: string): Promise<ResponseReportDto[]> {
    const reportsList = await this.reportService.listMine(Number(userId));
    return reportsList.map((report) => this.toDto(report));
  }

  // ---------- GET reports for a specific bike ----------
  @ApiOperation({ summary: 'List reports for a specific bike' })
  @ApiResponse({ status: 200, type: ResponseReportDto, isArray: true })
  @Get('bikes/:bikeId')
  async listForBike(
    @CurrentUser('userId') userId: string,
    @Param('bikeId', ParseIntPipe) bikeId: number,
  ): Promise<ResponseReportDto[]> {
    const reportsList = await this.reportService.listForBike(Number(userId), bikeId);
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
  async getPublic(@Param('token') token: string): Promise<ReportSnapshot> {
    return await this.reportService.getPublicSnapshot(token);
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
      is_public: report.is_public,
      view_count: report.view_count,
      last_viewed_at: report.last_viewed_at,
      revoked: report.revoked,
      expires_at: report.expires_at,
      created_at: report.created_at,
    };
  }
}
