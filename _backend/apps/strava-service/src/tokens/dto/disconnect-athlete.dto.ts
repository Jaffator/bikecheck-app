import { IsInt, IsPositive } from 'class-validator';

export class DisconnectAthleteDto {
  @IsInt()
  @IsPositive()
  athleteId!: number;
}
