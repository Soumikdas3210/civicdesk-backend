import {
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { EscalationTrigger, EscalationAction, Priority } from 'src/common/enums';

export class CreateEscalationRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsEnum(EscalationTrigger)
  trigger: EscalationTrigger;

  @ValidateIf((o) => o.trigger === EscalationTrigger.UNASSIGNED_FOR_HOURS)
  @IsInt()
  thresholdHours?: number;

  @IsOptional()
  @IsEnum(Priority)
  priorityFilter?: Priority;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsEnum(EscalationAction)
  action: EscalationAction;

  @ValidateIf((o) => o.action === EscalationAction.RAISE_PRIORITY)
  @IsEnum(Priority)
  targetPriority?: Priority;
}