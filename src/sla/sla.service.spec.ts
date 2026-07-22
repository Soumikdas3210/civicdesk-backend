import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SlaService } from './sla.service';
import { SLAPolicy } from './entities/sla-policy.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Priority } from 'src/common/enums';

describe('SlaService.computeDeadlines', () => {
  let slaService: SlaService;
  let policyRepo: { findOne: jest.Mock };

  const defaultConfig: Record<string, string> = {
    GLOBAL_DEFAULT_RESPONSE_HOURS: '24',
    GLOBAL_DEFAULT_RESOLUTION_HOURS: '72',
  };

  beforeEach(async () => {
    policyRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaService,
        { provide: getRepositoryToken(SLAPolicy), useValue: policyRepo },
        {
          provide: getRepositoryToken(Category),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => defaultConfig[key]) },
        },
      ],
    }).compile();

    slaService = module.get(SlaService);
  });

  it('uses the matching policy hours when one exists', async () => {
    policyRepo.findOne.mockResolvedValue({
      responseDueHours: 4,
      resolutionDueHours: 24,
    });

    const from = new Date('2026-01-01T00:00:00.000Z');
    const result = await slaService.computeDeadlines(
      'cat-1',
      Priority.HIGH,
      from,
    );

    expect(result.responseDueAt).toEqual(new Date('2026-01-01T04:00:00.000Z'));
    expect(result.resolutionDueAt).toEqual(
      new Date('2026-01-02T00:00:00.000Z'),
    );
  });

  it('falls back to the global defaults when no policy matches (INV-4)', async () => {
    policyRepo.findOne.mockResolvedValue(null);

    const from = new Date('2026-01-01T00:00:00.000Z');
    const result = await slaService.computeDeadlines(
      'cat-1',
      Priority.MEDIUM,
      from,
    );

    expect(result.responseDueAt).toEqual(new Date('2026-01-02T00:00:00.000Z')); // +24h
    expect(result.resolutionDueAt).toEqual(
      new Date('2026-01-04T00:00:00.000Z'),
    ); // +72h
  });

  it('computes both deadlines relative to the given `from` origin', async () => {
    policyRepo.findOne.mockResolvedValue({
      responseDueHours: 1,
      resolutionDueHours: 2,
    });

    const from = new Date('2026-06-15T10:00:00.000Z');
    const result = await slaService.computeDeadlines(
      'cat-1',
      Priority.URGENT,
      from,
    );

    expect(result.responseDueAt).toEqual(new Date('2026-06-15T11:00:00.000Z'));
    expect(result.resolutionDueAt).toEqual(
      new Date('2026-06-15T12:00:00.000Z'),
    );
  });
});
