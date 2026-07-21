import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/common/enums';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '',
    fullName: 'Test User',
    phone: undefined,
    role: Role.CITIZEN,
    isActive: true,
    departmentId: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('Passw0rd!', 10);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('fake-jwt-token'),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('registers then logs in, returning a token both times', async () => {
    usersService.createUser.mockResolvedValue(mockUser);
    const registerResult = await authService.register({
      email: mockUser.email,
      password: 'Passw0rd!',
      fullName: mockUser.fullName,
    });
    expect(registerResult.accessToken).toBe('fake-jwt-token');
    expect(registerResult.user.email).toBe(mockUser.email);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jwtService.sign is a jest.fn() mock, not a bound class method
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      }),
    );

    usersService.findByEmail.mockResolvedValue(mockUser);
    const loginResult = await authService.login({
      email: mockUser.email,
      password: 'Passw0rd!',
    });
    expect(loginResult.accessToken).toBe('fake-jwt-token');
    expect(loginResult.user.email).toBe(mockUser.email);
  });

  it('rejects login with the wrong password', async () => {
    usersService.findByEmail.mockResolvedValue(mockUser);
    await expect(
      authService.login({ email: mockUser.email, password: 'WrongPassword' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects login for a deactivated user', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...mockUser,
      isActive: false,
    });
    await expect(
      authService.login({ email: mockUser.email, password: 'Passw0rd!' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
