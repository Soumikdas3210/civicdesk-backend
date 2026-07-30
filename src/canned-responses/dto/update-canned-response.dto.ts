import { PartialType } from '@nestjs/swagger';
import { CreateCannedResponseDto } from './create-canned-response.dto';

export class UpdateCannedResponseDto extends PartialType(CreateCannedResponseDto) {}