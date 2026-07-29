import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}