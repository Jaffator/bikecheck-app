import { ApiProperty } from '@nestjs/swagger';
import { report_kind } from '@prisma/client';
import { IsEnum, IsInt, IsPositive, ValidateIf } from 'class-validator';

// What Export needs to make one Report. A discriminated body: which document is being
// made decides which of the fields below is required.
export class ExportReportDto {
  @IsEnum(report_kind)
  @ApiProperty({ enum: report_kind, example: report_kind.SERVICE })
  kind!: report_kind;

  // The Service a Service Report covers.
  @ValidateIf((dto: ExportReportDto) => dto.kind === report_kind.SERVICE)
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 42, description: 'Required when kind is SERVICE' })
  service_id!: number;
}
