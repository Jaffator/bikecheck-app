import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { report_kind } from '@prisma/client';
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, Matches, ValidateIf } from 'class-validator';

// A day, the way a Period is written: the calendar day the user picked, not an instant.
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Period and BikeCheck are read-only now: their Reports stay, a new export is a Bike Report.
const EXPORTABLE_KINDS = [report_kind.SERVICE, report_kind.BIKE] as const;
type ExportableKind = (typeof EXPORTABLE_KINDS)[number];

// What Export needs to make one Report. A discriminated body: which document is being
// made decides which of the fields below is required. Every conditional field is optional
// to the types and required by validation, so a body is only ever checked in one place.
export class ExportReportDto {
  @IsIn(EXPORTABLE_KINDS)
  @ApiProperty({ enum: EXPORTABLE_KINDS, example: report_kind.SERVICE })
  kind!: ExportableKind;

  // The Service a Service Report covers.
  @ValidateIf((dto: ExportReportDto) => dto.kind === report_kind.SERVICE)
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 42, description: 'Required when kind is SERVICE' })
  service_id?: number;

  @ValidateIf((dto: ExportReportDto) => dto.kind === report_kind.BIKE)
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 15, description: 'Required when kind is BIKE' })
  bike_id?: number;

  // The Period the history covers. Either end may be left open; both open is the whole history.
  @IsOptional()
  @Matches(DAY_PATTERN)
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Inclusive YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DAY_PATTERN)
  @ApiPropertyOptional({ example: '2026-12-31', description: 'Inclusive YYYY-MM-DD' })
  to?: string;

  // Frozen into the Report: a document exported without them never grows them.
  @ValidateIf((dto: ExportReportDto) => dto.kind === report_kind.BIKE)
  @IsBoolean()
  @ApiProperty({ example: true, description: 'Required when kind is BIKE' })
  include_components?: boolean;

  @ValidateIf((dto: ExportReportDto) => dto.kind === report_kind.BIKE)
  @IsBoolean()
  @ApiProperty({ example: true, description: 'Required when kind is BIKE' })
  include_history?: boolean;
}
