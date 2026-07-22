import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { User } from 'src/users/entities/user.entity';
import { Category } from 'src/categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department, User, Category])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService, TypeOrmModule],
})
export class DepartmentsModule {}
