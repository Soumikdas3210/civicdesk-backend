import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, LessThan } from 'typeorm';
import { Grievance } from '../grievances/entities/grievance.entity';
import { AuditLog } from '../grievances/entities/audit-log.entity';
import { EscalationRule } from '../escalation-rules/entities/escalation-rule.entity';
import {
  GrievanceStatus,
  AuditAction,
  NotificationType,
  EscalationTrigger,
  EscalationAction,
  Priority,
  ActorKind,
  GrievanceAction,
} from '../common/enums';
import { subDays } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { resolveTransition } from '../common/state-machine/transition-map';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../grievances/audit.service';
import { UsersService } from '../users/users.service';
import { SlaService } from './sla.service';

const PRIORITY_RANK: Record<Priority, number> = {
  [Priority.LOW]: 0,
  [Priority.MEDIUM]: 1,
  [Priority.HIGH]: 2,
  [Priority.URGENT]: 3,
};

@Injectable()
export class SlaScannerService {
  private readonly logger = new Logger(SlaScannerService.name);

  constructor(
    @InjectRepository(Grievance)
    private readonly grievanceRepo: Repository<Grievance>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(EscalationRule)
    private readonly ruleRepo: Repository<EscalationRule>,
    private readonly notificationService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly slaService: SlaService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE) // switch to EVERY_5_MINUTES in P2.5
  async scan() {
    await this.breachPass();
    await this.escalationPass();
    await this.autoClosePass();
  }

  // ---------- P2.1: breach pass (unchanged from before) ----------

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
        await this.flagBreach(g, 'response');
      }
      if (!g.resolutionBreached && !g.resolvedAt && g.resolutionDueAt < effectiveNow) {
        g.resolutionBreached = true;
        await this.flagBreach(g, 'resolution');
      }
      await this.grievanceRepo.save(g);
    }
  }

  private async flagBreach(g: Grievance, kind: 'response' | 'resolution') {
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

  // ---------- P2.3: escalation pass (new) ----------

  private async escalationPass() {
    const rules = await this.ruleRepo.find({ where: { isActive: true } });
    if (rules.length === 0) return;

    const open = await this.grievanceRepo.find({
      where: {
        status: Not(In([GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED])),
      },
      relations: { category: true },
    });

    for (const rule of rules) {
      for (const g of open) {
        if (!this.matches(rule, g)) continue;
        if (await this.alreadyApplied(rule, g)) continue;
        await this.applyRule(rule, g);
      }
    }
  }

  private matches(rule: EscalationRule, g: Grievance): boolean {
    const triggerOk = this.checkTrigger(rule, g);
    const priorityOk = !rule.priorityFilter || rule.priorityFilter === g.priority;
    const deptOk = !rule.departmentId || rule.departmentId === g.category.departmentId;
    return triggerOk && priorityOk && deptOk;
  }

  private checkTrigger(rule: EscalationRule, g: Grievance): boolean {
    const pausedNow = g.waitingSince
      ? Date.now() - g.waitingSince.getTime()
      : 0;
    const effectiveNow = new Date(Date.now() - Number(g.pausedMs) - pausedNow);

    switch (rule.trigger) {
      case EscalationTrigger.RESPONSE_OVERDUE:
        return !g.firstRespondedAt && g.responseDueAt < effectiveNow;

      case EscalationTrigger.RESOLUTION_OVERDUE:
        return !g.resolvedAt && g.resolutionDueAt < effectiveNow;

      case EscalationTrigger.UNASSIGNED_FOR_HOURS: {
        if (g.assignedOfficerId) return false;
        if (!rule.thresholdHours) return false;
        const ageHours = (Date.now() - g.createdAt.getTime()) / (1000 * 60 * 60);
        return ageHours >= rule.thresholdHours;
      }

      default:
        return false;
    }
  }

  private async alreadyApplied(rule: EscalationRule, g: Grievance): Promise<boolean> {
    const prior = await this.auditRepo.findOne({
      where: {
        grievanceId: g.id,
        escalationRuleId: rule.id,
        action: AuditAction.RULE_APPLIED,
      },
    });
    return !!prior;
  }

  private async applyRule(rule: EscalationRule, g: Grievance) {
    const previousPriority = g.priority;

    if (rule.action === EscalationAction.RAISE_PRIORITY && rule.targetPriority) {
      if (PRIORITY_RANK[rule.targetPriority] <= PRIORITY_RANK[g.priority]) {
        // target isn't actually higher than current — record nothing, don't loop forever
        return;
      }
      g.priority = rule.targetPriority;
      const deadlines = await this.slaService.computeDeadlines(
        g.categoryId,
        g.priority,
        g.createdAt,
      );
      g.responseDueAt = deadlines.responseDueAt;
      g.resolutionDueAt = deadlines.resolutionDueAt;
      await this.grievanceRepo.save(g);
    } else if (rule.action === EscalationAction.NOTIFY_ADMIN) {
      const adminIds = await this.usersService.getAdminIds();
      for (const userId of adminIds) {
        this.notificationService.notify({
          userId,
          type: NotificationType.ESCALATED,
          title: 'Escalation triggered',
          body: `Rule "${rule.name}" fired on ${g.trackingCode}.`,
          grievanceId: g.id,
          trackingCode: g.trackingCode,
        });
      }
    }

    await this.auditService.record({
      grievanceId: g.id,
      actorId: null,
      action: AuditAction.RULE_APPLIED,
      escalationRuleId: rule.id,
      metadata: {
        rule: rule.name,
        action: rule.action,
        fromPriority: previousPriority,
        toPriority: g.priority,
      },
    });
  }
  // ---------- P2.4: auto-close pass (new) ----------

  private async autoClosePass() {
    const days = Number(this.configService.get('AUTO_CLOSE_AFTER_DAYS'));
    const cutoff = subDays(new Date(), days);

    const stale = await this.grievanceRepo.find({
      where: {
        status: GrievanceStatus.RESOLVED,
        resolvedAt: LessThan(cutoff),
      },
    });

    for (const g of stale) {
      const fromStatus = g.status;
      const next = resolveTransition(
        fromStatus,
        ActorKind.SYSTEM,
        GrievanceAction.CLOSE,
      );
      g.status = next;
      await this.grievanceRepo.save(g);

      await this.auditService.record({
        grievanceId: g.id,
        actorId: null,
        action: AuditAction.STATUS_CHANGED,
        fromStatus,
        toStatus: next,
        metadata: { cause: 'AUTO_CLOSE' },
      });
    }
  }
}