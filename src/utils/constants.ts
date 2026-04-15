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
  USER: UserRole.user,
  CUSTOMER: UserRole.customer,
} as const;

export const ADMIN_ROLES: UserRole[] = [UserRole.mod, UserRole.agency];
export const CAN_CREATE_USER: UserRole[] = [UserRole.mod, UserRole.agency];
export const CAN_DELETE_USER: UserRole[] = [UserRole.mod, UserRole.agency];
export const CAN_UPDATE_USER: UserRole[] = [UserRole.mod, UserRole.agency];

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
    'users:create',
    'users:update',
    'workers:read',
    'agency_workers:read',
    'agency_workers:assign_user',
    'agency_workers:release',
    'permissions:read',
    'topup:submit',
  ],
  [UserRole.user]: ['users:read', 'workers:read', 'agency_workers:read', 'topup:submit'],
  [UserRole.customer]: [],
};
