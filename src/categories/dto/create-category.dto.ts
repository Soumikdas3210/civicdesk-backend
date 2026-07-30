import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Water Supply' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Pipeline leaks, low pressure, supply outages' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'PASTE-A-REAL-DEPARTMENT-UUID' })
  @IsUUID()
  departmentId: string;
}