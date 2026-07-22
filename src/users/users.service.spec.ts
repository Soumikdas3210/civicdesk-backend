import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Department } from 'src/departments/entities/department.entity';
import { Role } from 'src/common/enums';

describe('UsersService', () => {
  let usersService: UsersService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let deptRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((dto: Partial<User>) => dto as User),
      save: jest.fn((entity: Partial<User>) =>
        Promise.resolve({ id: 'new-id', ...entity } as User),
      ),
    };
    deptRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: getRepositoryToken(Department), useValue: deptRepo },
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
});
