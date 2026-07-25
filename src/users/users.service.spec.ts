import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Department } from 'src/departments/entities/department.entity';
import { Ward } from 'src/wards/entities/ward.entity';
import { GrievancesService } from 'src/grievances/grievances.service';
import { Role } from 'src/common/enums';

describe('UsersService', () => {
  let usersService: UsersService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let deptRepo: { findOne: jest.Mock };
  let wardRepo: { find: jest.Mock };
  let grievancesService: {
    grievanceIdsAssignedTo: jest.Mock;
    reconcileAssignments: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((dto: Partial<User>) => dto as User),
      save: jest.fn((entity: Partial<User>) =>
        Promise.resolve({ id: 'new-id', ...entity } as User),
      ),
    };
    deptRepo = { findOne: jest.fn() };
    wardRepo = { find: jest.fn() };
    grievancesService = {
      grievanceIdsAssignedTo: jest.fn().mockResolvedValue([]),
      reconcileAssignments: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: getRepositoryToken(Department), useValue: deptRepo },
        { provide: getRepositoryToken(Ward), useValue: wardRepo },
        { provide: GrievancesService, useValue: grievancesService },
      ],
    }).compile();

    usersService = module.get(UsersService);
  });

  it('rejects creating a citizen with a departmentId (INV-1)', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      usersService.createUser({
        email: 'citizen@example.com',
        password: 'Passw0rd!',
        fullName: 'A Citizen',
        role: Role.CITIZEN,
        departmentId: 'some-department-uuid',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a duplicate email', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing' });

    await expect(
      usersService.createUser({
        email: 'taken@example.com',
        password: 'Passw0rd!',
        fullName: 'Someone',
        role: Role.CITIZEN,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects setting a department on a citizen (INV-1)', async () => {
    repo.findOne.mockResolvedValue({ id: 'user-1', role: Role.CITIZEN });

    await expect(
      usersService.setDepartment('user-1', { departmentId: 'dept-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets a department on an officer', async () => {
    repo.findOne.mockResolvedValue({ id: 'user-1', role: Role.OFFICER });
    deptRepo.findOne.mockResolvedValue({ id: 'dept-1', name: 'Water Board' });

    const result = await usersService.setDepartment('user-1', {
      departmentId: 'dept-1',
    });
    expect(result.departmentId).toBe('dept-1');
  });

  it('rejects assigning wards to a citizen (INV-1)', async () => {
    repo.findOne.mockResolvedValue({ id: 'user-1', role: Role.CITIZEN });

    await expect(
      usersService.setWards('user-1', { wardIds: ['ward-1'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('resolves wards from the officer side of the M2M (INV-3)', async () => {
    repo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'karim@city.gov',
      passwordHash: 'should-not-leak',
      fullName: 'Karim Hossain',
      role: Role.OFFICER,
      isActive: true,
      departmentId: 'dept-1',
      createdAt: new Date(),
      wards: [{ id: 'ward-1', name: 'Ward 12', code: 'W-12' }],
    });

    const result = await usersService.findByIdWithWards('user-1');

    expect(result.wards).toHaveLength(1);
    expect(result.wards[0].id).toBe('ward-1');
    expect(result).not.toHaveProperty('passwordHash');
  });
});
