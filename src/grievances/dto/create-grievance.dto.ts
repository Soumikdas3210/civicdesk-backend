import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from 'src/common/enums';

export class CreateGrievanceDto {
  @ApiProperty({ example: 'Broken water pipe on Main Street' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'There has been a leaking pipe near the market for 3 days causing flooding.' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 'PASTE-A-REAL-CATEGORY-UUID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'PASTE-A-REAL-WARD-UUID' })
  @IsUUID()
  wardId: string;

  @ApiPropertyOptional({ enum: Priority, example: Priority.HIGH })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
