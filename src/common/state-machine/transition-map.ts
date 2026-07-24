import { ConflictException } from '@nestjs/common';
import { GrievanceStatus, ActorKind, GrievanceAction } from 'src/common/enums';

type TransitionKey = `${GrievanceStatus}:${ActorKind}:${GrievanceAction}`;

export const TRANSITIONS: Partial<Record<TransitionKey, GrievanceStatus>> = {
  // Officer or admin starts work. Requires an assignee (enforced in the service, not here).
  'OPEN:officer:START': GrievanceStatus.IN_PROGRESS,
  'OPEN:admin:START': GrievanceStatus.IN_PROGRESS,

  // Officer needs more information. Pauses the resolution clock.
  'IN_PROGRESS:officer:REQUEST_INFO': GrievanceStatus.WAITING_ON_CITIZEN,
  'IN_PROGRESS:admin:REQUEST_INFO': GrievanceStatus.WAITING_ON_CITIZEN,

  // Citizen answers. Resumes the clock. Triggered from the messages service (4.6).
  'WAITING_ON_CITIZEN:citizen:CITIZEN_REPLY': GrievanceStatus.IN_PROGRESS,

  // Resolve
  'IN_PROGRESS:officer:RESOLVE': GrievanceStatus.RESOLVED,
  'IN_PROGRESS:admin:RESOLVE': GrievanceStatus.RESOLVED,
  'WAITING_ON_CITIZEN:officer:RESOLVE': GrievanceStatus.RESOLVED,
  'WAITING_ON_CITIZEN:admin:RESOLVE': GrievanceStatus.RESOLVED,

  // Close, by a human or by the scheduled job after AUTO_CLOSE_AFTER_DAYS (Phase 2)
  'RESOLVED:admin:CLOSE': GrievanceStatus.CLOSED,
  'RESOLVED:system:CLOSE': GrievanceStatus.CLOSED,

  // Citizen is not satisfied. Starts a new resolution cycle.
  'RESOLVED:citizen:REOPEN': GrievanceStatus.REOPENED,

  // Officer picks the reopened case back up
  'REOPENED:officer:RESUME': GrievanceStatus.IN_PROGRESS,
  'REOPENED:admin:RESUME': GrievanceStatus.IN_PROGRESS,
};

/** Event-driven callers. Returns null when the map has nothing to say. */
export function tryTransition(
  status: GrievanceStatus,
  actor: ActorKind,
  action: GrievanceAction,
): GrievanceStatus | null {
  return TRANSITIONS[`${status}:${actor}:${action}`] ?? null;
}

/** The explicit status endpoint. A missing key is a user error. */
export function resolveTransition(
  status: GrievanceStatus,
  actor: ActorKind,
  action: GrievanceAction,
): GrievanceStatus {
  const next = tryTransition(status, actor, action);
  if (!next) {
    throw new ConflictException(
      `Cannot ${action} a grievance in ${status} as ${actor}`,
    );
  }
  return next;
}
