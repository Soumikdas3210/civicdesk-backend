import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString()
  name: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'colorHex must be a 6-digit hex color, e.g. #A1B2C3',
  })
  colorHex?: string;
}