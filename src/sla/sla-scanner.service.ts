import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Grievance } from '../grievances/entities/grievance.entity';
import { GrievanceStatus, AuditAction, NotificationType } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../grievances/audit.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SlaScannerService {
  private readonly logger = new Logger(SlaScannerService.name);

  constructor(
    @InjectRepository(Grievance)
    private readonly grievanceRepo: Repository<Grievance>,
    private readonly notificationService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE) // switch to EVERY_5_MINUTES before you tag v0.6
  async scan() {
    await this.breachPass();
  }

  private async breachPass() {
    const open = await this.grievanceRepo.find({
      where: {
        status: Not(In([GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED])),
      },
      relations: { category: true, assignedOfficer: true },
    });

    for (const g of open) {
      const pausedNow = g.waitingSince
        ? Date.now() - g.waitingSince.getTime()
        : 0;
      const effectiveNow = new Date(
        Date.now() - Number(g.pausedMs) - pausedNow,
      );

      if (!g.responseBreached && !g.firstRespondedAt && g.responseDueAt < effectiveNow) {
        g.responseBreached = true;
        await this.flag(g, 'response');
      }
      if (!g.resolutionBreached && !g.resolvedAt && g.resolutionDueAt < effectiveNow) {
        g.resolutionBreached = true;
        await this.flag(g, 'resolution');
      }
      await this.grievanceRepo.save(g);
    }
  }

  private async flag(g: Grievance, kind: 'response' | 'resolution') {
    await this.auditService.record({
      grievanceId: g.id,
      actorId: null,
      action: AuditAction.BREACH_FLAGGED,
      metadata: { kind },
    });

    const adminIds = await this.usersService.getAdminIds();
    const recipients = [g.assignedOfficerId, ...adminIds].filter(
      (id): id is string => !!id,
    );

    for (const userId of recipients) {
      this.notificationService.notify({
        userId,
        type: NotificationType.SLA_BREACH,
        title: 'SLA breach',
        body: `Grievance ${g.trackingCode} has breached its ${kind} deadline.`,
        grievanceId: g.id,
        trackingCode: g.trackingCode,
      });
    }
  }
}