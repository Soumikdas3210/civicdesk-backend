import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { WardsModule } from './wards/wards.module';
import { CategoriesModule } from './categories/categories.module';
import { SlaModule } from './sla/sla.module';
import { GrievancesModule } from './grievances/grievances.module';
import { MessagesModule } from './messages/messages.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [AuthModule, UsersModule, DepartmentsModule, WardsModule, CategoriesModule, SlaModule, GrievancesModule, MessagesModule, CommonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
