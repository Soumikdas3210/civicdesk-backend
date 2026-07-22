import { IsArray, IsUUID } from 'class-validator';

export class SetWardsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  wardIds: string[];
}
