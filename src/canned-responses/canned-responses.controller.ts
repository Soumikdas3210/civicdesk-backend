import {
  Controller, Post, Get, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from 'src/common/enums';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';
import { CannedResponsesService } from './canned-responses.service';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { UpdateCannedResponseDto } from './dto/update-canned-response.dto';

interface AuthenticatedRequest extends Request {
  user: ReturnType<typeof toUserResponse>;
}

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('canned-responses')
export class CannedResponsesController {
  constructor(private readonly service: CannedResponsesService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateCannedResponseDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id);
  }

  @Roles(Role.OFFICER, Role.ADMIN)
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    if (req.user.role === Role.ADMIN) return this.service.findAll();
    return this.service.findForOfficer(req.user.departmentId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCannedResponseDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}