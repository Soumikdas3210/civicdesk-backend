import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WardsService } from './wards.service';
import { Ward } from './entities/ward.entity';
import { Role } from 'src/common/enums';

describe('WardsService', () => {
  let wardsService: WardsService;
  let wardRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    wardRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WardsService,
        { provide: getRepositoryToken(Ward), useValue: wardRepo },
      ],
    }).compile();

    wardsService = module.get(WardsService);
  });

  it('resolves officers from the ward side of the M2M (INV-3)', async () => {
    wardRepo.findOne.mockResolvedValue({
      id: 'ward-1',
      name: 'Ward 12',
      code: 'W-12',
      officers: [
        {
          id: 'officer-1',
          email: 'karim@city.gov',
          passwordHash: 'should-not-leak',
          fullName: 'Karim Hossain',
          role: Role.OFFICER,
          isActive: true,
          departmentId: 'dept-1',
          createdAt: new Date(),
        },
      ],
    });

    const result = await wardsService.findOfficers('ward-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('officer-1');
    expect(result[0]).not.toHaveProperty('passwordHash');
  });
});
