import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetDepartmentDto {
  @ApiProperty({ example: 'PASTE-A-REAL-DEPARTMENT-UUID' })
  @IsUUID()
  departmentId: string;
}