import { ConflictException } from '@nestjs/common';
import { tryTransition, resolveTransition } from './transition-map';
import { GrievanceStatus, ActorKind, GrievanceAction } from 'src/common/enums';

describe('transition map', () => {
  it('allows every documented legal transition', () => {
    expect(
      tryTransition(
        GrievanceStatus.OPEN,
        ActorKind.OFFICER,
        GrievanceAction.START,
      ),
    ).toBe(GrievanceStatus.IN_PROGRESS);
    expect(
      tryTransition(
        GrievanceStatus.IN_PROGRESS,
        ActorKind.OFFICER,
        GrievanceAction.REQUEST_INFO,
      ),
    ).toBe(GrievanceStatus.WAITING_ON_CITIZEN);
    expect(
      tryTransition(
        GrievanceStatus.WAITING_ON_CITIZEN,
        ActorKind.CITIZEN,
        GrievanceAction.CITIZEN_REPLY,
      ),
    ).toBe(GrievanceStatus.IN_PROGRESS);
    expect(
      tryTransition(
        GrievanceStatus.IN_PROGRESS,
        ActorKind.OFFICER,
        GrievanceAction.RESOLVE,
      ),
    ).toBe(GrievanceStatus.RESOLVED);
    expect(
      tryTransition(
        GrievanceStatus.RESOLVED,
        ActorKind.ADMIN,
        GrievanceAction.CLOSE,
      ),
    ).toBe(GrievanceStatus.CLOSED);
    expect(
      tryTransition(
        GrievanceStatus.RESOLVED,
        ActorKind.SYSTEM,
        GrievanceAction.CLOSE,
      ),
    ).toBe(GrievanceStatus.CLOSED);
    expect(
      tryTransition(
        GrievanceStatus.RESOLVED,
        ActorKind.CITIZEN,
        GrievanceAction.REOPEN,
      ),
    ).toBe(GrievanceStatus.REOPENED);
    expect(
      tryTransition(
        GrievanceStatus.REOPENED,
        ActorKind.OFFICER,
        GrievanceAction.RESUME,
      ),
    ).toBe(GrievanceStatus.IN_PROGRESS);
  });

  it('OPEN to CLOSED is impossible by construction, not by a check', () => {
    expect(
      tryTransition(
        GrievanceStatus.OPEN,
        ActorKind.ADMIN,
        GrievanceAction.CLOSE,
      ),
    ).toBeNull();
    expect(() =>
      resolveTransition(
        GrievanceStatus.OPEN,
        ActorKind.ADMIN,
        GrievanceAction.CLOSE,
      ),
    ).toThrow(ConflictException);
  });

  it('a citizen cannot START a grievance out of OPEN', () => {
    expect(
      tryTransition(
        GrievanceStatus.OPEN,
        ActorKind.CITIZEN,
        GrievanceAction.START,
      ),
    ).toBeNull();
  });

  it('CLOSED is terminal: no action moves it anywhere', () => {
    for (const actor of [
      ActorKind.CITIZEN,
      ActorKind.OFFICER,
      ActorKind.ADMIN,
      ActorKind.SYSTEM,
    ]) {
      for (const action of Object.values(GrievanceAction)) {
        expect(tryTransition(GrievanceStatus.CLOSED, actor, action)).toBeNull();
      }
    }
  });

  it('tryTransition returns null on an inapplicable event; resolveTransition throws', () => {
    expect(
      tryTransition(
        GrievanceStatus.IN_PROGRESS,
        ActorKind.CITIZEN,
        GrievanceAction.CITIZEN_REPLY,
      ),
    ).toBeNull();
    expect(() =>
      resolveTransition(
        GrievanceStatus.IN_PROGRESS,
        ActorKind.CITIZEN,
        GrievanceAction.CITIZEN_REPLY,
      ),
    ).toThrow(ConflictException);
  });
});
