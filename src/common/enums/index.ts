// The three real user roles.
export enum Role { CITIZEN = 'citizen', OFFICER = 'officer', ADMIN = 'admin' }

// The actor dimension of the transition map (INV-6). A superset of Role.
// 'system' is the cron. No User ever has it. It holds no JWT. It is never assignable.
export enum ActorKind { CITIZEN = 'citizen', OFFICER = 'officer', ADMIN = 'admin', SYSTEM = 'system' }

export enum GrievanceStatus {
  OPEN = 'OPEN', IN_PROGRESS = 'IN_PROGRESS', WAITING_ON_CITIZEN = 'WAITING_ON_CITIZEN',
  RESOLVED = 'RESOLVED', REOPENED = 'REOPENED', CLOSED = 'CLOSED',
}

// Ordered. RANK is used to stop escalation demoting (Phase 2).
export enum Priority { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH', URGENT = 'URGENT' }
export const PRIORITY_RANK: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };

export enum GrievanceAction {
  START = 'START', REQUEST_INFO = 'REQUEST_INFO', CITIZEN_REPLY = 'CITIZEN_REPLY',
  RESOLVE = 'RESOLVE', CLOSE = 'CLOSE', REOPEN = 'REOPEN', RESUME = 'RESUME',
}

export enum AuditAction {
  CREATED = 'CREATED', STATUS_CHANGED = 'STATUS_CHANGED', ASSIGNED = 'ASSIGNED',
  UNASSIGNED_INELIGIBLE = 'UNASSIGNED_INELIGIBLE',   // INV-3 maintenance
  RECATEGORIZED = 'RECATEGORIZED', ESCALATED = 'ESCALATED',
  RULE_APPLIED = 'RULE_APPLIED',                     // INV-7 idempotency marker
  BREACH_FLAGGED = 'BREACH_FLAGGED',                 // INV-5 lifetime record
  RATING_RETRACTED = 'RATING_RETRACTED',             // INV-9 maintenance
}

export enum NotificationType {
  GRIEVANCE_SUBMITTED = 'GRIEVANCE_SUBMITTED', GRIEVANCE_ASSIGNED = 'GRIEVANCE_ASSIGNED',
  UNASSIGNED = 'UNASSIGNED', NEW_REPLY = 'NEW_REPLY',
  GRIEVANCE_RESOLVED = 'GRIEVANCE_RESOLVED', SLA_BREACH = 'SLA_BREACH', ESCALATED = 'ESCALATED',
}

export enum EscalationTrigger {
  RESPONSE_OVERDUE = 'RESPONSE_OVERDUE', RESOLUTION_OVERDUE = 'RESOLUTION_OVERDUE',
  UNASSIGNED_FOR_HOURS = 'UNASSIGNED_FOR_HOURS',
}

// FLAG_BREACH deliberately absent: it would give the breach flags a second
// writer and contradict INV-5, which names the scanner as the only one.
export enum EscalationAction { RAISE_PRIORITY = 'RAISE_PRIORITY', NOTIFY_ADMIN = 'NOTIFY_ADMIN' }