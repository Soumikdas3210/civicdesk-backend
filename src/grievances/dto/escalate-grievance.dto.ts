import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Priority } from 'src/common/enums';

export class EscalateGrievanceDto {
  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  targetPriority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyAdmin?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}