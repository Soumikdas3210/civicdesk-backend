import { Controller, UseGuards, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from 'src/common/enums';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';

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
}
