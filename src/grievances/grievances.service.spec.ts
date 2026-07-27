import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { GrievancesService } from './grievances.service';
import { Grievance } from './entities/grievance.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Ward } from 'src/wards/entities/ward.entity';
import { User } from 'src/users/entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { SlaService } from 'src/sla/sla.service';
import { AI_SERVICE } from 'src/ai/ai.interface';
import { FakeAiService } from 'src/ai/fake-ai.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Role, GrievanceStatus, Priority } from 'src/common/enums';

describe('GrievancesService', () => {
  let service: GrievancesService;
  let grievanceRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let userRepo: { findOne: jest.Mock };
  let slaService: { computeDeadlines: jest.Mock };
  let auditService: { record: jest.Mock };
  let notificationsService: { notify: jest.Mock };

  beforeEach(async () => {
    grievanceRepo = {
      findOne: jest.fn(),
      save: jest.fn((g) => Promise.resolve(g)),
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      findOneOrFail: jest.fn((opts) => grievanceRepo.findOne(opts)),
    };
    userRepo = { findOne: jest.fn() };
    slaService = {
      computeDeadlines: jest.fn().mockResolvedValue({
        responseDueAt: new Date('2026-01-02T00:00:00.000Z'),
        resolutionDueAt: new Date('2026-01-04T00:00:00.000Z'),
      }),
    };
    auditService = { record: jest.fn() };
    notificationsService = { notify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrievancesService,
        { provide: getRepositoryToken(Grievance), useValue: grievanceRepo },
        {
          provide: getRepositoryToken(Category),
          useValue: { findOne: jest.fn() },
        },
        { provide: getRepositoryToken(Ward), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: { find: jest.fn() },
        },
        {
          provide: getDataSourceToken(),
          useValue: { query: jest.fn(), getRepository: jest.fn() },
        },
        { provide: AuditService, useValue: auditService },
        { provide: SlaService, useValue: slaService },
        { provide: AI_SERVICE, useClass: FakeAiService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(GrievancesService);
  });

  const makeGrievance = (overrides: Partial<Grievance> = {}): Grievance =>
    ({
      id: 'g-1',
      status: GrievanceStatus.OPEN,
      citizenId: 'citizen-1',
      assignedOfficerId: null,
      categoryId: 'cat-1',
      priority: Priority.MEDIUM,
      pausedMs: '0',
      waitingSince: null,
      resolvedAt: null,
      resolutionBreached: false,
      firstRespondedAt: null,
      trackingCode: 'GRV-2026-000001',
      ...overrides,
    }) as Grievance;

  describe('changeStatus', () => {
    it('START on an unassigned grievance returns 403', async () => {
      const g = makeGrievance({
        status: GrievanceStatus.OPEN,
        assignedOfficerId: null,
      });
      grievanceRepo.findOne.mockResolvedValue(g);

      await expect(
        service.changeStatus('g-1', { action: 'START' } as any, {
          id: 'officer-1',
          role: Role.OFFICER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('a non-assignee officer changing status returns 403', async () => {
      const g = makeGrievance({
        status: GrievanceStatus.IN_PROGRESS,
        assignedOfficerId: 'someone-else',
      });
      grievanceRepo.findOne.mockResolvedValue(g);

      await expect(
        service.changeStatus('g-1', { action: 'RESOLVE' } as any, {
          id: 'officer-1',
          role: Role.OFFICER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("citizen resolving another citizen's grievance returns 403", async () => {
      const g = makeGrievance({
        status: GrievanceStatus.RESOLVED,
        citizenId: 'someone-else',
      });
      grievanceRepo.findOne.mockResolvedValue(g);

      await expect(
        service.changeStatus('g-1', { action: 'REOPEN' } as any, {
          id: 'citizen-1',
          role: Role.CITIZEN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('an illegal transition returns 409', async () => {
      const g = makeGrievance({
        status: GrievanceStatus.OPEN,
        citizenId: 'citizen-1',
      });
      grievanceRepo.findOne.mockResolvedValue(g);

      await expect(
        service.changeStatus('g-1', { action: 'CLOSE' } as any, {
          id: 'admin-1',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('applyTransition', () => {
    it('reopen clears resolvedAt and recomputes resolutionDueAt from now', async () => {
      const g = makeGrievance({
        status: GrievanceStatus.RESOLVED,
        resolvedAt: new Date('2026-01-01T00:00:00.000Z'),
        resolutionBreached: true,
      });

      await service.applyTransition(g, GrievanceStatus.REOPENED, 'citizen-1');

      expect(g.resolvedAt).toBeNull();
      expect(g.resolutionBreached).toBe(false);
      expect(g.resolutionDueAt).toEqual(new Date('2026-01-04T00:00:00.000Z'));
      expect(slaService.computeDeadlines).toHaveBeenCalledWith(
        'cat-1',
        Priority.MEDIUM,
        expect.any(Date),
      );
    });

    it('reopen does not clear firstRespondedAt', async () => {
      const respondedAt = new Date('2026-01-01T05:00:00.000Z');
      const g = makeGrievance({
        status: GrievanceStatus.RESOLVED,
        firstRespondedAt: respondedAt,
      });

      await service.applyTransition(g, GrievanceStatus.REOPENED, 'citizen-1');

      expect(g.firstRespondedAt).toEqual(respondedAt);
    });

    it('entering and leaving WAITING_ON_CITIZEN accumulates pausedMs', async () => {
      const g = makeGrievance({
        status: GrievanceStatus.IN_PROGRESS,
        pausedMs: '0',
      });

      await service.applyTransition(
        g,
        GrievanceStatus.WAITING_ON_CITIZEN,
        'officer-1',
      );
      expect(g.waitingSince).not.toBeNull();
      const enteredAt = (g.waitingSince as Date).getTime();

      g.waitingSince = new Date(enteredAt - 5000);

      await service.applyTransition(
        g,
        GrievanceStatus.IN_PROGRESS,
        'officer-1',
      );
      expect(g.waitingSince).toBeNull();
      expect(BigInt(g.pausedMs)).toBeGreaterThanOrEqual(5000n);
    });

    it('resolving sends a GRIEVANCE_RESOLVED notification, but no other transition does', async () => {
      const g = makeGrievance({ status: GrievanceStatus.IN_PROGRESS });

      await service.applyTransition(g, GrievanceStatus.RESOLVED, 'officer-1');
      expect(notificationsService.notify).toHaveBeenCalledTimes(1);

      notificationsService.notify.mockClear();

      const g2 = makeGrievance({ status: GrievanceStatus.IN_PROGRESS });
      await service.applyTransition(
        g2,
        GrievanceStatus.WAITING_ON_CITIZEN,
        'officer-1',
      );
      expect(notificationsService.notify).not.toHaveBeenCalled();
    });
  });

  describe('assign', () => {
    it('assign to an officer in the wrong department returns 403', async () => {
      const g = makeGrievance({ categoryId: 'cat-1' });
      g.category = { departmentId: 'dept-A' } as any;
      grievanceRepo.findOne.mockResolvedValue(g);

      const officer = {
        id: 'officer-1',
        role: Role.OFFICER,
        isActive: true,
        departmentId: 'dept-B',
        wards: [{ id: 'ward-1' }],
      };
      (service as any).dataSource = {
        getRepository: () => ({
          findOne: jest.fn().mockResolvedValue(officer),
        }),
      };

      await expect(
        service.assign(
          'g-1',
          { officerId: 'officer-1' },
          { id: 'admin-1', role: Role.ADMIN },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('assign to an officer not covering the ward returns 403', async () => {
      const g = makeGrievance({ categoryId: 'cat-1', wardId: 'ward-1' });
      g.category = { departmentId: 'dept-A' } as any;
      grievanceRepo.findOne.mockResolvedValue(g);

      const officer = {
        id: 'officer-1',
        role: Role.OFFICER,
        isActive: true,
        departmentId: 'dept-A',
        wards: [{ id: 'ward-2' }],
      };
      (service as any).dataSource = {
        getRepository: () => ({
          findOne: jest.fn().mockResolvedValue(officer),
        }),
      };

      await expect(
        service.assign(
          'g-1',
          { officerId: 'officer-1' },
          { id: 'admin-1', role: Role.ADMIN },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('assign to an inactive officer returns 403', async () => {
      const g = makeGrievance({ categoryId: 'cat-1', wardId: 'ward-1' });
      g.category = { departmentId: 'dept-A' } as any;
      grievanceRepo.findOne.mockResolvedValue(g);

      const officer = {
        id: 'officer-1',
        role: Role.OFFICER,
        isActive: false,
        departmentId: 'dept-A',
        wards: [{ id: 'ward-1' }],
      };
      (service as any).dataSource = {
        getRepository: () => ({
          findOne: jest.fn().mockResolvedValue(officer),
        }),
      };

      await expect(
        service.assign(
          'g-1',
          { officerId: 'officer-1' },
          { id: 'admin-1', role: Role.ADMIN },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('assign does not change status', async () => {
      const g = makeGrievance({
        categoryId: 'cat-1',
        wardId: 'ward-1',
        status: GrievanceStatus.OPEN,
      });
      g.category = { departmentId: 'dept-A' } as any;
      grievanceRepo.findOne.mockResolvedValue(g);
      grievanceRepo.findOneOrFail.mockResolvedValue(g);

      const officer = {
        id: 'officer-1',
        role: Role.OFFICER,
        isActive: true,
        departmentId: 'dept-A',
        wards: [{ id: 'ward-1' }],
      };
      (service as any).dataSource = {
        getRepository: () => ({
          findOne: jest.fn().mockResolvedValue(officer),
        }),
      };

      await service.assign(
        'g-1',
        { officerId: 'officer-1' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(g.status).toBe(GrievanceStatus.OPEN);
    });
  });

  describe('reconcileAssignments', () => {
    it("changing an officer's department unassigns their grievances", async () => {
      const g = makeGrievance({
        categoryId: 'cat-1',
        wardId: 'ward-1',
        assignedOfficerId: 'officer-1',
      });
      g.category = { departmentId: 'dept-A' } as any;
      g.assignedOfficer = {
        id: 'officer-1',
        role: Role.OFFICER,
        isActive: true,
        departmentId: 'dept-B',
        wards: [{ id: 'ward-1' }],
      } as any;
      grievanceRepo.find.mockResolvedValue([g]);

      const cleared = await service.reconcileAssignments(
        ['g-1'],
        'ASSIGNED' as any,
      );

      expect(cleared).toEqual(['g-1']);
      expect(g.assignedOfficerId).toBeNull();
      expect(g.assignedOfficer).toBeNull();
    });

    it("narrowing an officer's wards unassigns the stranded grievances", async () => {
      const g = makeGrievance({
        categoryId: 'cat-1',
        wardId: 'ward-1',
        assignedOfficerId: 'officer-1',
      });
      g.category = { departmentId: 'dept-A' } as any;
      g.assignedOfficer = {
        id: 'officer-1',
        role: Role.OFFICER,
        isActive: true,
        departmentId: 'dept-A',
        wards: [{ id: 'ward-2' }],
      } as any;
      grievanceRepo.find.mockResolvedValue([g]);

      const cleared = await service.reconcileAssignments(
        ['g-1'],
        'ASSIGNED' as any,
      );

      expect(cleared).toEqual(['g-1']);
      expect(g.assignedOfficerId).toBeNull();
    });

    it('leaves an eligible officer untouched', async () => {
      const g = makeGrievance({
        categoryId: 'cat-1',
        wardId: 'ward-1',
        assignedOfficerId: 'officer-1',
      });
      g.category = { departmentId: 'dept-A' } as any;
      g.assignedOfficer = {
        id: 'officer-1',
        role: Role.OFFICER,
        isActive: true,
        departmentId: 'dept-A',
        wards: [{ id: 'ward-1' }],
      } as any;
      grievanceRepo.find.mockResolvedValue([g]);

      const cleared = await service.reconcileAssignments(
        ['g-1'],
        'ASSIGNED' as any,
      );

      expect(cleared).toEqual([]);
      expect(g.assignedOfficerId).toBe('officer-1');
    });
  });

  describe('findAll', () => {
    it('citizen GET /grievances returns only their own via a citizenId filter', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      (grievanceRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      await service.findAll({}, { id: 'citizen-1', role: Role.CITIZEN });

      expect(qb.andWhere).toHaveBeenCalledWith('g.citizenId = :uid', {
        uid: 'citizen-1',
      });
    });

    it('officer with zero covered wards gets an empty result, not a query error', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'officer-1',
        departmentId: 'dept-A',
        wards: [],
      });
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      };
      (grievanceRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.findAll(
        {},
        {
          id: 'officer-1',
          role: Role.OFFICER,
        },
      );

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
      expect(qb.getManyAndCount).not.toHaveBeenCalled();
    });

    it('officer with covered wards scopes by department and ward', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'officer-1',
        departmentId: 'dept-A',
        wards: [{ id: 'ward-1' }],
      });
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      (grievanceRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      await service.findAll({}, { id: 'officer-1', role: Role.OFFICER });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'category.departmentId = :dept',
        { dept: 'dept-A' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('g.wardId IN (:...wardIds)', {
        wardIds: ['ward-1'],
      });
    });
  });

  describe('create', () => {
    it('submit with no SLA policy still yields non-null deadlines', async () => {
      const categoryRepoMock = {
        findOne: jest.fn().mockResolvedValue({
          id: 'cat-1',
          name: 'Pipe Leak',
          isActive: true,
        }),
      };
      const wardRepoMock = {
        findOne: jest.fn().mockResolvedValue({ id: 'ward-1' }),
      };
      (service as any).categoryRepo = categoryRepoMock;
      (service as any).wardRepo = wardRepoMock;
      (service as any).dataSource.query = jest
        .fn()
        .mockResolvedValue([{ nextval: '1' }]);
      grievanceRepo.create.mockImplementation((dto) => dto);
      grievanceRepo.save.mockImplementation((g) =>
        Promise.resolve({ ...g, id: 'new-id' }),
      );
      grievanceRepo.findOneOrFail.mockImplementation((opts) =>
        grievanceRepo.findOne(opts),
      );
      grievanceRepo.findOne.mockResolvedValue({
        id: 'new-id',
        responseDueAt: new Date(),
        resolutionDueAt: new Date(),
      });

      const result = await service.create(
        {
          title: 'Test',
          description: 'A long enough description',
          categoryId: 'cat-1',
          wardId: 'ward-1',
        },
        'citizen-1',
      );

      expect(slaService.computeDeadlines).toHaveBeenCalled();
      expect(result.responseDueAt).not.toBeNull();
      expect(result.resolutionDueAt).not.toBeNull();
    });
  });
  describe('getHistory', () => {
    it('citizen gets 403 on /history', async () => {
      await expect(
        service.getHistory('g-1', { id: 'citizen-1', role: Role.CITIZEN }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
