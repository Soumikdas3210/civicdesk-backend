import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../enums';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = (user: { role: Role } | undefined) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    }).compile();

    guard = module.get(RolesGuard);
    reflector = module.get(Reflector);
  });

  it('blocks a citizen token on an admin-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = mockExecutionContext({ role: Role.CITIZEN });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows an admin token on an admin-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = mockExecutionContext({ role: Role.ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows any authenticated user when no @Roles() is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = mockExecutionContext({ role: Role.CITIZEN });
    expect(guard.canActivate(context)).toBe(true);
  });
});
