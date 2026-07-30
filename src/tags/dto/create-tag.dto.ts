import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'Water' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '#3498DB' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'colorHex must be a 6-digit hex color, e.g. #A1B2C3',
  })
  colorHex?: string;
}