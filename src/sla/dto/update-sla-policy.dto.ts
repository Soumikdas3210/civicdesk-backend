import { PartialType } from '@nestjs/swagger';
import { CreateSLAPolicyDto } from './create-sla-policy.dto';

export class UpdateSLAPolicyDto extends PartialType(CreateSLAPolicyDto) {}
