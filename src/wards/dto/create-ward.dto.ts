import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWardDto {
  @ApiProperty({ example: 'Ward 12' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'W12' })
  @IsString()
  @MinLength(1)
  code: string;
}