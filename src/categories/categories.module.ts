import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from 'src/departments/entities/department.entity';
import { Category } from './entities/category.entity';
import { SLAPolicy } from 'src/sla/entities/sla-policy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Department, SLAPolicy])],
  controllers: [CategoriesController],
  providers: [CategoriesService, TypeOrmModule],
})
export class CategoriesModule {}
