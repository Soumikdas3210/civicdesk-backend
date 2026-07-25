import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SlaScannerService } from './sla-scanner.service';
import { Grievance } from '../grievances/entities/grievance.entity';
import { AuditLog } from '../grievances/entities/audit-log.entity';
import { EscalationRule } from '../escalation-rules/entities/escalation-rule.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../grievances/audit.service';
import { UsersService } from '../users/users.service';
import { SlaService } from './sla.service';
import {
  GrievanceStatus,
  Priority,
  EscalationTrigger,
  EscalationAction,
  AuditAction,
} from '../common/enums';

describe('SlaScannerService', () => {
  let service: SlaScannerService;
  let grievanceRepo: any;
  let auditRepo: any;
  let ruleRepo: any;
  let auditService: any;
  let usersService: any;
  let notificationService: any;
  let slaService: any;
  let configService: any;

  beforeEach(async () => {
    grievanceRepo = { find: jest.fn(), save: jest.fn() };
    auditRepo = { findOne: jest.fn() };
    ruleRepo = { find: jest.fn() };
    auditService = { record: jest.fn() };
    usersService = { getAdminIds: jest.fn().mockResolvedValue(['admin-1']) };
    notificationService = { notify: jest.fn() };
    slaService = {
      computeDeadlines: jest.fn().mockResolvedValue({
        responseDueAt: new Date(),
        resolutionDueAt: new Date(),
      }),
    };
    configService = { get: jest.fn().mockReturnValue('7') };

    const module = await Test.createTestingModule({
      providers: [
        SlaScannerService,
        { provide: getRepositoryToken(Grievance), useValue: grievanceRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(EscalationRule), useValue: ruleRepo },
        { provide: NotificationsService, useValue: notificationService },
        { provide: AuditService, useValue: auditService },
        { provide: UsersService, useValue: usersService },
        { provide: SlaService, useValue: slaService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(SlaScannerService);
  });

  describe('breach pass', () => {
    it('flags a grievance whose responseDueAt has passed with no first response', async () => {
      const grievance: any = {
        id: 'g1',
        trackingCode: 'GRV-1',
        status: GrievanceStatus.OPEN,
        responseDueAt: new Date(Date.now() - 60_000),
        resolutionDueAt: new Date(Date.now() + 60_000),
        firstRespondedAt: null,
        resolvedAt: null,
        responseBreached: false,
        resolutionBreached: false,
        waitingSince: null,
        pausedMs: '0',
        assignedOfficerId: null,
      };
      grievanceRepo.find.mockResolvedValueOnce([grievance]); // breachPass
      ruleRepo.find.mockResolvedValueOnce([]); // escalationPass, no rules
      grievanceRepo.find.mockResolvedValueOnce([]); // autoClosePass, no stale ones

      await service.scan();

      expect(grievance.responseBreached).toBe(true);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.BREACH_FLAGGED }),
      );
      expect(notificationService.notify).toHaveBeenCalled();
    });

    it('does NOT flag a grievance in WAITING_ON_CITIZEN past its raw deadline', async () => {
      const grievance: any = {
        id: 'g2',
        trackingCode: 'GRV-2',
        status: GrievanceStatus.WAITING_ON_CITIZEN,
        // Raw deadline was 500 seconds ago...
        responseDueAt: new Date(Date.now() - 500_000),
        resolutionDueAt: new Date(Date.now() + 999_999),
        firstRespondedAt: null,
        resolvedAt: null,
        responseBreached: false,
        resolutionBreached: false,
        // ...but it's been paused for 1,000 seconds — longer than the overdue amount —
        // so the "effective" clock hasn't actually reached the deadline yet.
        waitingSince: new Date(Date.now() - 1_000_000),
        pausedMs: '0',
        assignedOfficerId: null,
      };
      grievanceRepo.find.mockResolvedValueOnce([grievance]);
      ruleRepo.find.mockResolvedValueOnce([]);
      grievanceRepo.find.mockResolvedValueOnce([]);

      await service.scan();

      expect(grievance.responseBreached).toBe(false);
    });
  });

  describe('escalation pass (INV-7)', () => {
    it('applies a matching rule only once across two scan cycles', async () => {
      const rule: any = {
        id: 'rule-1',
        name: 'Unassigned test',
        isActive: true,
        trigger: EscalationTrigger.UNASSIGNED_FOR_HOURS,
        thresholdHours: 0,
        action: EscalationAction.NOTIFY_ADMIN,
        priorityFilter: null,
        departmentId: null,
      };
      const grievance: any = {
        id: 'g3',
        trackingCode: 'GRV-3',
        status: GrievanceStatus.OPEN,
        priority: Priority.MEDIUM,
        assignedOfficerId: null,
        createdAt: new Date(Date.now() - 3600_000),
        category: { departmentId: 'dept-1' },
        responseDueAt: new Date(Date.now() + 999_999),
        resolutionDueAt: new Date(Date.now() + 999_999),
        firstRespondedAt: null,
        resolvedAt: null,
        responseBreached: false,
        resolutionBreached: false,
        waitingSince: null,
        pausedMs: '0',
      };

      // Run 1: no prior RULE_APPLIED row exists yet
      grievanceRepo.find.mockResolvedValueOnce([]); // breachPass
      ruleRepo.find.mockResolvedValueOnce([rule]); // escalationPass
      grievanceRepo.find.mockResolvedValueOnce([grievance]); // escalationPass grievances
      auditRepo.findOne.mockResolvedValueOnce(null); // alreadyApplied? no
      grievanceRepo.find.mockResolvedValueOnce([]); // autoClosePass

      await service.scan();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.RULE_APPLIED }),
      );
      expect(auditService.record).toHaveBeenCalledTimes(1);

      // Run 2: now a prior RULE_APPLIED row DOES exist
      grievanceRepo.find.mockResolvedValueOnce([]);
      ruleRepo.find.mockResolvedValueOnce([rule]);
      grievanceRepo.find.mockResolvedValueOnce([grievance]);
      auditRepo.findOne.mockResolvedValueOnce({ id: 'existing-audit-row' }); // alreadyApplied? yes
      grievanceRepo.find.mockResolvedValueOnce([]);

      await service.scan();

      // still only 1 call total across both scans — the second scan added nothing
      expect(auditService.record).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-close pass (INV-6)', () => {
    it('closes a RESOLVED grievance past the cutoff with actorId null', async () => {
      const staleGrievance: any = {
        id: 'g4',
        trackingCode: 'GRV-4',
        status: GrievanceStatus.RESOLVED,
        resolvedAt: new Date(Date.now() - 8 * 24 * 3600_000),
      };
      grievanceRepo.find.mockResolvedValueOnce([]); // breachPass
      ruleRepo.find.mockResolvedValueOnce([]); // escalationPass
      grievanceRepo.find.mockResolvedValueOnce([staleGrievance]); // autoClosePass

      await service.scan();

      expect(staleGrievance.status).toBe(GrievanceStatus.CLOSED);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: null,
          fromStatus: GrievanceStatus.RESOLVED,
          toStatus: GrievanceStatus.CLOSED,
          metadata: expect.objectContaining({ cause: 'AUTO_CLOSE' }),
        }),
      );
    });
  });
});