import { Module } from '@nestjs/common';
import { GrievancesService } from './grievances.service';
import { GrievancesController } from './grievances.controller';
import { Grievance } from './entities/grievance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Grievance])],
  controllers: [GrievancesController],
  providers: [GrievancesService],
  exports: [GrievancesService, TypeOrmModule],
})
export class GrievancesModule {}
