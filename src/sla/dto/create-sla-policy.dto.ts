import { IsEnum, IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Priority } from 'src/common/enums';

export class CreateSLAPolicyDto {
  @ApiProperty({ example: 'PASTE-A-REAL-CATEGORY-UUID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ enum: Priority, example: Priority.HIGH })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({ example: 24 })
  @IsInt()
  @Min(1)
  responseDueHours: number;

  @ApiProperty({ example: 72 })
  @IsInt()
  @Min(1)
  resolutionDueHours: number;
}