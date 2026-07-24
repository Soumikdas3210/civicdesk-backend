import { Module } from '@nestjs/common';
import { GrievancesService } from './grievances.service';
import { GrievancesController } from './grievances.controller';
import { Grievance } from './entities/grievance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Grievance, AuditLog])],
  controllers: [GrievancesController],
  providers: [GrievancesService, AuditService],
  exports: [GrievancesService, AuditService, TypeOrmModule],
})
export class GrievancesModule {}
