import { Module } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { SlaScannerService } from './sla-scanner.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SLAPolicy } from './entities/sla-policy.entity';
import { Grievance } from '../grievances/entities/grievance.entity';
import { AuditLog } from '../grievances/entities/audit-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AuditService } from '../grievances/audit.service';
import { Category } from 'src/categories/entities/category.entity';
import { forwardRef } from '@nestjs/common';
import { EscalationRule } from 'src/escalation-rules/entities/escalation-rule.entity';

@Module({
  imports: [
  TypeOrmModule.forFeature([SLAPolicy, Grievance, AuditLog, Category, EscalationRule]),
  NotificationsModule,
  forwardRef(() => UsersModule),
],
  controllers: [SlaController],
  providers: [SlaService, SlaScannerService, AuditService],
  exports: [SlaService],
})
export class SlaModule {}