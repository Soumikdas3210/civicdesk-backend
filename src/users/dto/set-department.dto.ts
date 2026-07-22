import { IsUUID } from 'class-validator';

export class SetDepartmentDto {
  @IsUUID()
  departmentId: string;
}
