import { IsArray, IsUUID } from 'class-validator';

export class RetagGrievanceDto {
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds: string[];
}