import {
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EscalationTrigger, EscalationAction, Priority } from 'src/common/enums';

export class CreateEscalationRuleDto {
  @ApiProperty({ example: 'Water Board unassigned 24h' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ enum: EscalationTrigger, example: EscalationTrigger.UNASSIGNED_FOR_HOURS })
  @IsEnum(EscalationTrigger)
  trigger: EscalationTrigger;

  @ApiPropertyOptional({ example: 24 })
  @ValidateIf((o) => o.trigger === EscalationTrigger.UNASSIGNED_FOR_HOURS)
  @IsInt()
  thresholdHours?: number;

  @ApiPropertyOptional({ enum: Priority, example: Priority.HIGH })
  @IsOptional()
  @IsEnum(Priority)
  priorityFilter?: Priority;

  @ApiPropertyOptional({ example: 'PASTE-A-REAL-DEPARTMENT-UUID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ enum: EscalationAction, example: EscalationAction.NOTIFY_ADMIN })
  @IsEnum(EscalationAction)
  action: EscalationAction;

  @ApiPropertyOptional({ enum: Priority, example: Priority.URGENT })
  @ValidateIf((o) => o.action === EscalationAction.RAISE_PRIORITY)
  @IsEnum(Priority)
  targetPriority?: Priority;
}