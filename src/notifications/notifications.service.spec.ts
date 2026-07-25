import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { MailService } from '../mail/mail.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: { save: jest.Mock; create: jest.Mock };
  let mailService: { send: jest.Mock };

  beforeEach(async () => {
    repo = { save: jest.fn(), create: jest.fn((x) => x) };
    mailService = { send: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('resolves even when the repository save rejects (INV-11)', async () => {
    repo.save.mockRejectedValue(new Error('DB down'));
    await expect(
      service.notify({ userId: '1', type: 'GRIEVANCE_SUBMITTED' as any, title: 't', body: 'b' }),
    ).resolves.toBeUndefined();
  });
});