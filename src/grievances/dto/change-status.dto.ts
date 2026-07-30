import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GrievanceAction } from 'src/common/enums';

export class ChangeStatusDto {
  @ApiProperty({ enum: GrievanceAction, example: GrievanceAction.RESOLVE })
  @IsEnum(GrievanceAction)
  action: GrievanceAction;
}
