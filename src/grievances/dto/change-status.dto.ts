import { IsEnum } from 'class-validator';
import { GrievanceAction } from 'src/common/enums';

export class ChangeStatusDto {
  @IsEnum(GrievanceAction)
  action: GrievanceAction;
}
