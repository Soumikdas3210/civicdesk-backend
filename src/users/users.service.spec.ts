import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from 'src/common/enums';

describe('UsersService', () => {
  let usersService: UsersService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((dto: Partial<User>) => dto as User),
      save: jest.fn((entity: Partial<User>) =>
        Promise.resolve({ id: 'new-id', ...entity } as User),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
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
});
