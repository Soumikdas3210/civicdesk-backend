import { IsEnum, IsInt, IsUUID, Min } from 'class-validator';
import { Priority } from 'src/common/enums';

export class CreateSLAPolicyDto {
  @IsUUID()
  categoryId: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsInt()
  @Min(1)
  responseDueHours: number;

  @IsInt()
  @Min(1)
  resolutionDueHours: number;
}
