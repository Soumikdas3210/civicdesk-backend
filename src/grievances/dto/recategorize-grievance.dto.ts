import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RecategorizeGrievanceDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;
}