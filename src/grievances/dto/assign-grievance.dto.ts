import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignGrievanceDto {
  @ApiPropertyOptional({ example: 'PASTE-A-REAL-OFFICER-UUID' })
  @IsOptional()
  @IsUUID()
  officerId?: string;
}
