import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums';
import { Request } from 'express';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';

interface AuthenticatedRequest extends Request {
  user: ReturnType<typeof toUserResponse>;
}

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('grievances/:grievanceId/rating')
export class RatingsController {
  constructor(private readonly service: RatingsService) {}

  @Roles(Role.CITIZEN)
  @Post()
  rate(
    @Param('grievanceId') grievanceId: string,
    @Body() dto: CreateRatingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.rate(grievanceId, dto, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Roles(Role.OFFICER, Role.ADMIN)
  @Get()
  find(
    @Param('grievanceId') grievanceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findForGrievance(grievanceId, {
      id: req.user.id,
      role: req.user.role,
    });
  }
}