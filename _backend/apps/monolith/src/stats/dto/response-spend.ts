import { ApiProperty } from '@nestjs/swagger';

export class Response_SpendCategoryDto {
  @ApiProperty({ example: 'group:3', description: '"group:<id>", "other" or "unassigned"' })
  key!: string;

  @ApiProperty({ type: Number, example: 3, nullable: true })
  component_group_id!: number | null;

  @ApiProperty({ type: String, example: 'Suspension', nullable: true })
  group_name!: string | null;

  @ApiProperty({ type: String, example: 'componentGroup.suspension', nullable: true })
  i18n_key!: string | null;

  @ApiProperty({ example: 6800 })
  amount!: number;
}

export class Response_SpendBikeDto {
  @ApiProperty({ example: 21 })
  bike_id!: number;

  @ApiProperty({ example: 'Santa Cruz' })
  bike_brand!: string;

  @ApiProperty({ type: String, example: 'Hightower', nullable: true })
  bike_model!: string | null;

  @ApiProperty({ type: Number, example: 2022, nullable: true })
  year!: number | null;

  @ApiProperty({ example: 9200 })
  total!: number;

  @ApiProperty({ example: 4, description: 'Services in from/to, free ones included' })
  service_count!: number;
}

export class Response_SpendDto {
  @ApiProperty({
    type: String,
    example: '2026-01-01',
    nullable: true,
    description: 'First Service Date counted, inclusive; null is an open end',
  })
  from!: string | null;

  @ApiProperty({
    type: String,
    example: null,
    nullable: true,
    description: 'Last Service Date counted, inclusive; null is an open end. Both null counts undated Services too',
  })
  to!: string | null;

  @ApiProperty({ type: String, example: 'CZK', nullable: true })
  currency!: string | null;

  @ApiProperty({ example: 14860, description: 'Equals History Totals for from/to across all bikes' })
  total!: number;

  @ApiProperty({
    type: [Response_SpendCategoryDto],
    description: 'Top 3 categories, then other, then unassigned; non-zero only',
  })
  categories!: Response_SpendCategoryDto[];

  @ApiProperty({ type: [Response_SpendBikeDto], description: 'Bikes with spend, highest first' })
  bikes!: Response_SpendBikeDto[];
}
