import { ApiProperty } from '@nestjs/swagger';
import { setup_profiles } from '@prisma/client';

// The four pressure columns are Decimal in the row and go out as numbers, so they are declared
// here rather than inherited.
type PressureColumn = 'front_tire_psi' | 'rear_tire_psi' | 'fork_pressure_psi' | 'shock_pressure_psi';

// One Setup Profile as the row holds it. Everything is psi - converting tyres to the owner's Tyre
// Pressure Unit is the screen's job. A number at null was never written down; a zero is a real zero.
export class Response_SetupProfileDto implements Omit<setup_profiles, PressureColumn> {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 15 })
  bike_id!: number;

  @ApiProperty({ example: 'Trail' })
  name!: string;

  @ApiProperty({ example: 'Wet, muddy Loket', nullable: true })
  note!: string | null;

  @ApiProperty({ example: 24.5, nullable: true })
  front_tire_psi!: number | null;

  @ApiProperty({ example: 27.0, nullable: true })
  rear_tire_psi!: number | null;

  @ApiProperty({ example: 85.0, nullable: true })
  fork_pressure_psi!: number | null;

  @ApiProperty({ example: 2, nullable: true })
  fork_tokens!: number | null;

  @ApiProperty({ example: 20, nullable: true })
  fork_sag_percent!: number | null;

  @ApiProperty({ example: 8, nullable: true, description: 'Clicks from fully closed' })
  fork_rebound_ls!: number | null;

  @ApiProperty({ example: 3, nullable: true, description: 'Clicks from fully closed' })
  fork_rebound_hs!: number | null;

  @ApiProperty({ example: 10, nullable: true, description: 'Clicks from fully closed' })
  fork_compression_ls!: number | null;

  @ApiProperty({ example: 2, nullable: true, description: 'Clicks from fully closed' })
  fork_compression_hs!: number | null;

  @ApiProperty({ example: 185.0, nullable: true })
  shock_pressure_psi!: number | null;

  @ApiProperty({ example: 1, nullable: true })
  shock_tokens!: number | null;

  @ApiProperty({ example: 30, nullable: true })
  shock_sag_percent!: number | null;

  @ApiProperty({ example: 6, nullable: true, description: 'Clicks from fully closed' })
  shock_rebound_ls!: number | null;

  @ApiProperty({ example: 2, nullable: true, description: 'Clicks from fully closed' })
  shock_rebound_hs!: number | null;

  @ApiProperty({ example: 9, nullable: true, description: 'Clicks from fully closed' })
  shock_compression_ls!: number | null;

  @ApiProperty({ example: 1, nullable: true, description: 'Clicks from fully closed' })
  shock_compression_hs!: number | null;

  // Exactly one profile of a bike is active: the one the owner last chose on the Setup screen.
  @ApiProperty({ example: true, description: 'The profile the bike is ridden at right now' })
  is_active!: boolean;

  @ApiProperty({ example: '2026-09-11T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-09-11T12:00:00.000Z' })
  updated_at!: Date;
}
