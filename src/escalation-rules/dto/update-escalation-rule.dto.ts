import { PartialType } from '@nestjs/mapped-types';
import { CreateEscalationRuleDto } from './create-escalation-rule.dto';

export class UpdateEscalationRuleDto extends PartialType(CreateEscalationRuleDto) {}