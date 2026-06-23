import { Controller, Get, Post, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { reports } from '@prisma/client';
import { ReportService } from './report.service';
import { ResponseReportDto } from './dto/response-report.dto';
import { ReportSnapshot } from './report.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ---------- POST generate a report for a bike ----------
  @ApiOperation({ summary: 'Generate a shareable report for a bike' })
  @ApiResponse({ status: 201, type: ResponseReportDto })
  @Post('bikes/:bikeId')
  async create(
    @CurrentUser('userId') userId: string,
    @Param('bikeId', ParseIntPipe) bikeId: number,
  ): Promise<ResponseReportDto> {
    const report = await this.reportService.create(Number(userId), bikeId);
    return this.toDto(report);
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

  // ---------- PATCH revoke a report link ----------
  @ApiOperation({ summary: 'Revoke a report link' })
  @ApiResponse({ status: 200 })
  @Patch(':id/revoke')
  async revoke(@Param('id', ParseIntPipe) id: number, @CurrentUser('userId') userId: string): Promise<void> {
    return this.reportService.revoke(id, Number(userId));
  }

  // ---------- GET public report by token (no auth) ----------
  @Public()
  @ApiOperation({ summary: 'Public view of a report by its share token' })
  @ApiResponse({ status: 200 })
  @Get('public/:token')
  async getPublic(@Param('token') token: string): Promise<ReportSnapshot> {
    return this.reportService.getPublicSnapshot(token);
  }

  // Maps a report row to the lightweight DTO (without the heavy snapshot).
  private toDto(report: reports): ResponseReportDto {
    const baseUrl = process.env.PUBLIC_APP_URL ?? '';
    return {
      id: report.id,
      public_token: report.public_token,
      share_url: `${baseUrl}/r/${report.public_token}`,
      bike_id: report.bike_id,
      view_count: report.view_count,
      last_viewed_at: report.last_viewed_at,
      revoked: report.revoked,
      expires_at: report.expires_at,
      created_at: report.created_at,
    };
  }
}
