import { Module } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SLAPolicy } from './entities/sla-policy.entity';
import { Category } from 'src/categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SLAPolicy, Category])],
  controllers: [SlaController],
  providers: [SlaService],
  exports: [SlaService, TypeOrmModule],
})
export class SlaModule {}
