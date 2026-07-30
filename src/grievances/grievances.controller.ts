import {
  Controller,
  Post,
  UseGuards,
  Req,
  Body,
  Patch,
  Param,
  Get,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GrievancesService } from './grievances.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role, GrievanceStatus, Priority } from 'src/common/enums';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateGrievanceDto } from './dto/create-grievance.dto';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';
import { Request } from 'express';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignGrievanceDto } from './dto/assign-grievance.dto';
import { QueryGrievancesDto } from './dto/query-grievance.dto';
import { RetagGrievanceDto } from './dto/retag-grievance.dto';
import { RecategorizeGrievanceDto } from './dto/recategorize-grievance.dto';
import { EscalateGrievanceDto } from './dto/escalate-grievance.dto';

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

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.grievancesService.changeStatus(id, dto, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Roles(Role.OFFICER, Role.ADMIN)
  @Patch(':id/assign')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignGrievanceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.grievancesService.assign(id, dto, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Roles(Role.OFFICER, Role.ADMIN)
  @Patch(':id/tags')
  retag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetagGrievanceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.grievancesService.retag(id, dto.tagIds, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @ApiQuery({ name: 'status', required: false, enum: GrievanceStatus })
  @ApiQuery({ name: 'priority', required: false, enum: Priority })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'wardId', required: false })
  @ApiQuery({ name: 'tagId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get()
  findAll(
    @Query() query: QueryGrievancesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.grievancesService.findAll(query, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.grievancesService.findOneScoped(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.grievancesService.getHistory(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }

@Roles(Role.OFFICER, Role.ADMIN)
@Patch(':id/category')
recategorize(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: RecategorizeGrievanceDto,
  @Req() req: AuthenticatedRequest,
) {
  return this.grievancesService.recategorize(id, dto, {
    id: req.user.id,
    role: req.user.role,
  });
}

@Roles(Role.OFFICER, Role.ADMIN)
@Patch(':id/escalate')
escalate(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: EscalateGrievanceDto,
  @Req() req: AuthenticatedRequest,
) {
  return this.grievancesService.escalate(id, dto, {
    id: req.user.id,
    role: req.user.role,
  });
}

@Roles(Role.OFFICER, Role.ADMIN)
@Post(':id/summarize')
summarize(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
  return this.grievancesService.summarizeGrievanceThread(id, { id: req.user.id, role: req.user.role });
}

@Roles(Role.OFFICER, Role.ADMIN)
@Post(':id/suggest-reply')
suggestReply(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
  return this.grievancesService.suggestGrievanceReply(id, { id: req.user.id, role: req.user.role });
}

}
