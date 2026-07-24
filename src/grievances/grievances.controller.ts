import { Controller, Post, UseGuards, Req, Body } from '@nestjs/common';
import { GrievancesService } from './grievances.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateGrievanceDto } from './dto/create-grievance.dto';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: ReturnType<typeof toUserResponse>;
}

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('grievances')
export class GrievancesController {
  constructor(private readonly grievancesService: GrievancesService) {}

  @Roles(Role.CITIZEN)
  @Post()
  create(@Body() dto: CreateGrievanceDto, @Req() req: AuthenticatedRequest) {
    return this.grievancesService.create(dto, req.user.id);
  }
}
