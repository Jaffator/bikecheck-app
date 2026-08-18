import { ApiProperty } from '@nestjs/swagger';

export class ResponseStravaAuthorizeUrlDto {
  @ApiProperty({
    example: 'https://www.strava.com/oauth/authorize?client_id=235898&state=a3f2...',
  })
  url!: string;
}
