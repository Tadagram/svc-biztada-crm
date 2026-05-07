import {
  UserRole,
  UserStatus,
  AssignmentStatus,
  NotificationType,
  TopUpStatus,
} from '@prisma/client';

export const USER_ROLES = {
  MOD: UserRole.mod,
  AGENCY: UserRole.agency,
  ACCOUNTANT: UserRole.accountant,
  USER: UserRole.user,
  CUSTOMER: UserRole.customer,
} as const;

export const ADMIN_ROLES: UserRole[] = [UserRole.mod, UserRole.agency, UserRole.accountant];
export const CAN_CREATE_USER: UserRole[] = [UserRole.mod];
export const CAN_DELETE_USER: UserRole[] = [UserRole.mod];
export const CAN_UPDATE_USER: UserRole[] = [UserRole.mod];

export const USER_STATUSES = {
  ACTIVE: UserStatus.active,
  DISABLED: UserStatus.disabled,
} as const;

export const ASSIGNMENT_STATUSES = {
  ACTIVE: AssignmentStatus.active,
  COMPLETED: AssignmentStatus.completed,
  REVOKED: AssignmentStatus.revoked,
} as const;

// ── Notification Type Constants ────────────────────────────────────────────
export const NOTIFICATION_TYPES = {
  SYSTEM_ALERT: NotificationType.system_alert,
  USER_ACTION: NotificationType.user_action,
  WORKER_ASSIGNED: NotificationType.worker_assigned,
  WORKER_RELEASED: NotificationType.worker_released,
  PERMISSION_CHANGED: NotificationType.permission_changed,
  ACCOUNT_UPDATED: NotificationType.account_updated,
  CUSTOM: NotificationType.custom,
} as const;

// ── TopUp Status Constants (Prisma enum) ───────────────────────────────────
export const TOPUP_STATUSES = {
  PENDING: TopUpStatus.PENDING,
  APPROVED: TopUpStatus.APPROVED,
  REJECTED: TopUpStatus.REJECTED,
} as const;

export const TOPUP_CREDIT_RATE = 10;

// ── Worker Status Constants (not in Prisma enum, but should use these) ─────
export const WORKER_STATUSES = {
  READY: 'ready',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

export type WorkerStatus = (typeof WORKER_STATUSES)[keyof typeof WORKER_STATUSES];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.mod]: [],
  [UserRole.agency]: [
    'users:read',
    'topup:review',
    'portals:read',
    'portals:manage',
  ],
  [UserRole.accountant]: ['topup:review'],
  [UserRole.user]: [],
  [UserRole.customer]: [],
};
