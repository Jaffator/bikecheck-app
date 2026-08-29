import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { reports } from '@prisma/client';
import { ReportService } from './report.service';
import { ExportReportDto } from './dto/export-report.dto';
import { ResponseExportedReportDto, ResponseReportDto } from './dto/response-report.dto';
import { ReportSnapshot } from './report.types';
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
