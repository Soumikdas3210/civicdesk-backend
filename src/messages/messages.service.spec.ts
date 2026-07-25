import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Message } from './entities/message.entity';
import { GrievancesService } from 'src/grievances/grievances.service';
import { Role, GrievanceStatus } from 'src/common/enums';
import { NotificationsService } from 'src/notifications/notifications.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let messageRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let grievancesService: {
    findRawById: jest.Mock;
    saveRaw: jest.Mock;
    applyTransition: jest.Mock;
    isEligibleById: jest.Mock;
  };

  const makeGrievance = (overrides: any = {}) => ({
    id: 'g-1',
    citizenId: 'citizen-1',
    assignedOfficerId: 'officer-1',
    status: GrievanceStatus.IN_PROGRESS,
    firstRespondedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    messageRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((m) => Promise.resolve({ id: 'msg-1', ...m })),
      find: jest.fn(),
    };
    grievancesService = {
      findRawById: jest.fn(),
      saveRaw: jest.fn((g) => Promise.resolve(g)),
      applyTransition: jest.fn(),
      isEligibleById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: messageRepo },
        { provide: GrievancesService, useValue: grievancesService },
        { provide: NotificationsService, useValue: { notify: jest.fn() } },
      ],
    }).compile();

    service = module.get(MessagesService);
  });

  describe('postMessage', () => {
    it('a non-assignee officer posting a message returns 403', async () => {
      const g = makeGrievance({ assignedOfficerId: 'someone-else' });
      grievancesService.findRawById.mockResolvedValue(g);

      await expect(
        service.postMessage(
          'g-1',
          { body: 'hi', isInternal: false },
          { id: 'officer-1', role: Role.OFFICER },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('internal message does not set firstRespondedAt', async () => {
      const g = makeGrievance({ firstRespondedAt: null });
      grievancesService.findRawById.mockResolvedValue(g);

      await service.postMessage(
        'g-1',
        { body: 'internal note', isInternal: true },
        { id: 'officer-1', role: Role.OFFICER },
      );

      expect(g.firstRespondedAt).toBeNull();
      expect(grievancesService.saveRaw).not.toHaveBeenCalled();
    });

    it('the first public officer message sets firstRespondedAt', async () => {
      const g = makeGrievance({ firstRespondedAt: null });
      grievancesService.findRawById.mockResolvedValue(g);

      await service.postMessage(
        'g-1',
        { body: 'we are on it', isInternal: false },
        { id: 'officer-1', role: Role.OFFICER },
      );

      expect(g.firstRespondedAt).not.toBeNull();
      expect(grievancesService.saveRaw).toHaveBeenCalledWith(g);
    });

    it('citizen reply on IN_PROGRESS does not throw (tryTransition returns null, no-op)', async () => {
      const g = makeGrievance({
        status: GrievanceStatus.IN_PROGRESS,
        citizenId: 'citizen-1',
      });
      grievancesService.findRawById.mockResolvedValue(g);

      await expect(
        service.postMessage(
          'g-1',
          { body: 'update', isInternal: false },
          { id: 'citizen-1', role: Role.CITIZEN },
        ),
      ).resolves.toBeDefined();
      expect(grievancesService.applyTransition).not.toHaveBeenCalled();
    });

    it('citizen reply on WAITING_ON_CITIZEN triggers applyTransition to IN_PROGRESS', async () => {
      const g = makeGrievance({
        status: GrievanceStatus.WAITING_ON_CITIZEN,
        citizenId: 'citizen-1',
      });
      grievancesService.findRawById.mockResolvedValue(g);

      await service.postMessage(
        'g-1',
        { body: 'ok', isInternal: false },
        { id: 'citizen-1', role: Role.CITIZEN },
      );

      expect(grievancesService.applyTransition).toHaveBeenCalledWith(
        g,
        GrievanceStatus.IN_PROGRESS,
        'citizen-1',
      );
    });

    it('citizen cannot post an internal note', async () => {
      const g = makeGrievance({ citizenId: 'citizen-1' });
      grievancesService.findRawById.mockResolvedValue(g);

      await expect(
        service.postMessage(
          'g-1',
          { body: 'trying', isInternal: true },
          { id: 'citizen-1', role: Role.CITIZEN },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findThread', () => {
    it('internal message absent from the citizen thread response, filtered in the query', async () => {
      const g = makeGrievance({ citizenId: 'citizen-1' });
      grievancesService.findRawById.mockResolvedValue(g);
      messageRepo.find.mockResolvedValue([]);

      await service.findThread('g-1', { id: 'citizen-1', role: Role.CITIZEN });

      expect(messageRepo.find).toHaveBeenCalledWith({
        where: { grievanceId: 'g-1', isInternal: false },
        order: { createdAt: 'ASC' },
      });
    });

    it('officer with full access sees both public and internal (no isInternal filter)', async () => {
      const g = makeGrievance();
      grievancesService.findRawById.mockResolvedValue(g);
      grievancesService.isEligibleById.mockResolvedValue(true);
      messageRepo.find.mockResolvedValue([]);

      await service.findThread('g-1', { id: 'officer-1', role: Role.OFFICER });

      expect(messageRepo.find).toHaveBeenCalledWith({
        where: { grievanceId: 'g-1' },
        order: { createdAt: 'ASC' },
      });
    });
  });
});
