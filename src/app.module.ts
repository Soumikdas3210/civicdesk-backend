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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from './notifications/notifications.module';
import { MailModule } from './mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EscalationRulesModule } from './escalation-rules/escalation-rules.module';
import { TagsModule } from './tags/tags.module';
import { RatingsModule } from './ratings/ratings.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CannedResponsesModule } from './canned-responses/canned-responses.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DepartmentsModule,
    WardsModule,
    CategoriesModule,
    SlaModule,
    GrievancesModule,
    MessagesModule,
    CommonModule,
    MailModule,
    EscalationRulesModule,
    TagsModule,
    RatingsModule,
    AttachmentsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST'),
        port: +cfg.get('DB_PORT'),
        username: cfg.get('DB_USERNAME'),
        password: cfg.get('DB_PASSWORD'),
        database: cfg.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: cfg.get('NODE_ENV') === 'development',
      }),
    }),
    NotificationsModule,
    EscalationRulesModule,
    TagsModule,
    RatingsModule,
    AttachmentsModule,
    AnalyticsModule,
    CannedResponsesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
