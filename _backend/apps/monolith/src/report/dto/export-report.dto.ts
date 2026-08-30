import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { report_kind } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, Matches, ValidateIf } from 'class-validator';

// A day, the way a Period is written: the calendar day the user picked, not an instant.
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// What Export needs to make one Report. A discriminated body: which document is being
// made decides which of the fields below is required. Every conditional field is optional
// to the types and required by validation, so a body is only ever checked in one place.
export class ExportReportDto {
  @IsEnum(report_kind)
  @ApiProperty({ enum: report_kind, example: report_kind.SERVICE })
  kind!: report_kind;

  // The Service a Service Report covers.
  @ValidateIf((dto: ExportReportDto) => dto.kind === report_kind.SERVICE)
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 42, description: 'Required when kind is SERVICE' })
  service_id?: number;

  // The Bike a Period Report or a BikeCheck covers.
  @ValidateIf((dto: ExportReportDto) => dto.kind !== report_kind.SERVICE)
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 15, description: 'Required when kind is PERIOD or BIKECHECK' })
  bike_id?: number;

  // The Period the Report covers. Either end may be left open; both open is all time.
  @IsOptional()
  @Matches(DAY_PATTERN)
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Inclusive YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DAY_PATTERN)
  @ApiPropertyOptional({ example: '2026-12-31', description: 'Inclusive YYYY-MM-DD' })
  to?: string;

  // Whether the Period Report also carries the bike's Mounted Components. Frozen into the
  // Report: a document exported without them never grows them.
  @ValidateIf((dto: ExportReportDto) => dto.kind === report_kind.PERIOD)
  @IsBoolean()
  @ApiProperty({ example: false, description: 'Required when kind is PERIOD' })
  include_components?: boolean;
}
