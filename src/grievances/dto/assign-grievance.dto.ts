import { IsOptional, IsUUID } from 'class-validator';

export class AssignGrievanceDto {
  @IsOptional()
  @IsUUID()
  officerId?: string;
}
