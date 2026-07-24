import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Priority } from 'src/common/enums';

export class CreateGrievanceDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  wardId: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
