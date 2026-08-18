import { IsInt, IsPositive } from 'class-validator';

export class CreateOAuthStateDto {
  @IsInt()
  @IsPositive()
  userId!: number;
}
