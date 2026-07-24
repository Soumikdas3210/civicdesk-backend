import { Module } from '@nestjs/common';
import { GrievancesService } from './grievances.service';
import { GrievancesController } from './grievances.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [GrievancesController],
  providers: [GrievancesService, AuditService],
  exports: [GrievancesService, AuditService, TypeOrmModule],
})
export class GrievancesModule {}
