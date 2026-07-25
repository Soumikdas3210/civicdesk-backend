import { Module } from '@nestjs/common';
import { GrievancesService } from './grievances.service';
import { GrievancesController } from './grievances.controller';
import { Grievance } from './entities/grievance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { Category } from 'src/categories/entities/category.entity';
import { Ward } from 'src/wards/entities/ward.entity';
import { SlaModule } from 'src/sla/sla.module';
import { AiModule } from 'src/ai/ai.module';
import { User } from 'src/users/entities/user.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Grievance, AuditLog, Category, Ward, User]),
    SlaModule,
    AiModule,
    NotificationsModule,
  ],
  controllers: [GrievancesController],
  providers: [GrievancesService, AuditService],
  exports: [GrievancesService, AuditService, TypeOrmModule],
})
export class GrievancesModule {}
