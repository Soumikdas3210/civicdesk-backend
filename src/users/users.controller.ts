import {
  Controller,
  UseGuards,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from 'src/common/enums';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';
import { SetDepartmentDto } from './dto/set-department.dto';
import { SetWardsDto } from './dto/set-wards.dto';
import { ListUsersDto } from './dto/list-users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async createStaff(@Body() dto: CreateStaffDto) {
    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      phone: dto.phone,
      role: dto.role,
      departmentId: undefined,
    });
    return toUserResponse(user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/department')
  setDepartment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetDepartmentDto) {
    return this.usersService.setDepartment(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/wards')
  setWards(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetWardsDto) {
    return this.usersService.setWards(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)  
@Roles(Role.ADMIN)
@Get()
findAll(@Query() query: ListUsersDto) {
  return this.usersService.findAll(query);
}


@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Patch(':id/deactivate')
deactivate(@Param('id', ParseUUIDPipe) id: string) {
  return this.usersService.deactivate(id);
}
}
