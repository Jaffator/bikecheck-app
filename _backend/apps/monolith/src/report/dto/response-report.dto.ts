import { ApiProperty } from '@nestjs/swagger';
import { report_kind } from '@prisma/client';
import { ReportSnapshot } from '../report.types';

// What a Report is about, frozen with the document rather than read off live data - so a
// Report for a bike its owner has since deleted still says which bike it was.
export class ResponseReportCoversDto {
  @ApiProperty({ example: 'Pivot Firebird 2023' })
  bike!: string;

  @ApiProperty({
    example: '2026-01-01',
    nullable: true,
    description: "Inclusive YYYY-MM-DD. A Service's date, a Period's start; null is an open end",
  })
  from!: string | null;

  @ApiProperty({ example: '2026-12-31', nullable: true, description: 'Inclusive YYYY-MM-DD' })
  to!: string | null;
}

// Report metadata for the owner's management list. The frozen document itself never
// leaves the server here - only what `covers` reads off it.
export class ResponseReportDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'b1f7c0e2-2a3d-4e5f-8a9b-0c1d2e3f4a5b' })
  public_token!: string;

  @ApiProperty({ example: 'https://app.bikecheck.com/r/b1f7c0e2-2a3d-4e5f-8a9b-0c1d2e3f4a5b' })
  share_url!: string;

  @ApiProperty({ enum: report_kind, example: report_kind.SERVICE })
  kind!: report_kind;

  @ApiProperty({ example: 42 })
  bike_id!: number;

  @ApiProperty({ type: ResponseReportCoversDto })
  covers!: ResponseReportCoversDto;

  @ApiProperty({ example: false, description: 'A report stays closed until it is published' })
  is_public!: boolean;

  @ApiProperty({ example: 3 })
  view_count!: number;

  @ApiProperty({ example: null, nullable: true })
  last_viewed_at!: Date | null;

  @ApiProperty({ example: false })
  revoked!: boolean;

  @ApiProperty({ example: null, nullable: true })
  expires_at!: Date | null;

  @ApiProperty({ example: '2026-06-23T12:00:00.000Z' })
  created_at!: Date;
}

// What Export answers with. The snapshot rides along so the owner previews the document
// they just made without a second round trip, and without the public route counting a
// view on a report only they have seen.
export class ResponseExportedReportDto extends ResponseReportDto {
  @ApiProperty({ description: 'The frozen document, exactly as a reader would receive it' })
  snapshot!: ReportSnapshot;
}
