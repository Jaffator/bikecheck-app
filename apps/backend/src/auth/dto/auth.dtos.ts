import { ApiProperty } from '@nestjs/swagger';

import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'strongPassword123' })
  password: string;
}

export class LoginResponse {
  jwt_token: string;
  userID: number;
  email: string;
}
