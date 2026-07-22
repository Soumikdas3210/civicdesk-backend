import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { WardsService } from './wards.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums';
import { CreateWardDto } from './dto/create-ward.dto';
import { UpdateWardDto } from './dto/update-ward.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wards')
export class WardsController {
  constructor(private readonly wardsService: WardsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateWardDto) {
    return this.wardsService.create(dto);
  }

  @Get()
  findAll() {
    return this.wardsService.findAll();
  }

  @Get(':id')
  findOne(id: string) {
    return this.wardsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWardDto) {
    return this.wardsService.update(id, dto);
  }
}
