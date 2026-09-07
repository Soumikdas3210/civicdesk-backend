import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from 'src/common/enums';

export class CreateGrievanceDto {
  @ApiProperty({ example: 'Broken water pipe on Main Street' })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @ApiProperty({
    example:
      'There has been a leaking pipe near the market for 3 days causing flooding.',
  })
  @IsString()
  @MinLength(20)
  description: string;

  @ApiProperty({ example: 'PASTE-A-REAL-CATEGORY-UUID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'PASTE-A-REAL-WARD-UUID' })
  @IsUUID()
  wardId: string;

  @ApiPropertyOptional({
    enum: Priority,
    example: Priority.HIGH,
    description:
      'Ignored when the caller is a citizen. Priority is set by triage and changed through escalation.',
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
