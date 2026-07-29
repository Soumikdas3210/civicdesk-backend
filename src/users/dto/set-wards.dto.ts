import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetWardsDto {
  @ApiProperty({ example: ['PASTE-A-REAL-WARD-UUID'], isArray: true })
  @IsArray()
  @IsUUID('4', { each: true })
  wardIds: string[];
}