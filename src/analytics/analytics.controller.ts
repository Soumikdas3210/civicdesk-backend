import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from 'src/common/enums';
import { AnalyticsService } from './analytics.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  overview() { return this.analyticsService.getOverview(); }

  @Get('officers')
  officers() { return this.analyticsService.getOfficerStats(); }

  @Get('departments')
  departments() { return this.analyticsService.getDepartmentStats(); }

  @Get('categories')
  categories() { return this.analyticsService.getCategoryStats(); }

  @Get('wards')
  wards() { return this.analyticsService.getWardStats(); }

  @Get('sla')
  sla() { return this.analyticsService.getSlaStats(); }
}