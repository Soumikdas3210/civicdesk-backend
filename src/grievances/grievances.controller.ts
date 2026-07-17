import { Controller } from '@nestjs/common';
import { GrievancesService } from './grievances.service';

@Controller('grievances')
export class GrievancesController {
  constructor(private readonly grievancesService: GrievancesService) {}
}
