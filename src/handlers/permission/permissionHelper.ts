import { PrismaClient, Prisma } from '@prisma/client';

export interface PermissionInfo {
  permission_id: string;
  code: string;
  name: string;
}

export interface UserPermissionOverride {
  allow: string[];
  deny: string[];
}

interface UserCustomFields {
  permission_overrides?: {
    allow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

function normalizeCodes(codes: string[]): string[] {
  return Array.from(
    new Set(codes.filter((code) => typeof code === 'string' && code.length > 0)),
  ).sort();
}

function parseOverrides(customFields: unknown): UserPermissionOverride {
  if (!customFields || typeof customFields !== 'object') {
    return { allow: [], deny: [] };
  }

  const fields = customFields as UserCustomFields;
  const overrides = fields.permission_overrides;

  if (!overrides || typeof overrides !== 'object') {
    return { allow: [], deny: [] };
  }

  const allow = Array.isArray(overrides.allow)
    ? normalizeCodes(overrides.allow.filter((v): v is string => typeof v === 'string'))
    : [];
  const deny = Array.isArray(overrides.deny)
    ? normalizeCodes(overrides.deny.filter((v): v is string => typeof v === 'string'))
    : [];

  return { allow, deny };
}

function mergeOverridesIntoCustomFields(customFields: unknown, overrides: UserPermissionOverride) {
  const base: Record<string, unknown> =
    customFields && typeof customFields === 'object'
      ? { ...(customFields as Record<string, unknown>) }
      : {};

  if (overrides.allow.length === 0 && overrides.deny.length === 0) {
    delete base.permission_overrides;
    return base as Prisma.InputJsonObject;
  }

  base.permission_overrides = {
    ...(overrides.allow.length > 0 ? { allow: overrides.allow } : {}),
    ...(overrides.deny.length > 0 ? { deny: overrides.deny } : {}),
  } as Prisma.InputJsonObject;

  return base as Prisma.InputJsonObject;
}

export async function getRolePermissions(
  prisma: PrismaClient,
  role: string,
): Promise<PermissionInfo[]> {
  const rolePermissions = await prisma.rolePermissions.findMany({
    where: {
      role,
      deleted_at: null,
    },
    include: {
      permission: {
        select: {
          permission_id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  return rolePermissions.map((rp) => ({
    permission_id: rp.permission.permission_id,
    code: rp.permission.code,
    name: rp.permission.name,
  }));
}

export async function getUserPermissionOverrides(
  prisma: PrismaClient,
  userId: string,
): Promise<UserPermissionOverride> {
  const user = await prisma.users.findUnique({
    where: { user_id: userId },
    select: { custom_fields: true },
  });

  return parseOverrides(user?.custom_fields);
}

export async function setUserPermissionOverrides(
  prisma: PrismaClient,
  userId: string,
  input: UserPermissionOverride,
): Promise<UserPermissionOverride> {
  const allowInput = normalizeCodes(input.allow);
  const denyInput = normalizeCodes(input.deny);

  const denySet = new Set(denyInput);
  const allow = allowInput.filter((code) => !denySet.has(code));
  const deny = denyInput;

  const requestedCodes = normalizeCodes([...allow, ...deny]);
  if (requestedCodes.length > 0) {
    const existing = await prisma.permissions.findMany({
      where: { code: { in: requestedCodes } },
      select: { code: true },
    });
    const existingSet = new Set(existing.map((p) => p.code));
    const invalid = requestedCodes.filter((code) => !existingSet.has(code));
    if (invalid.length > 0) {
      throw new Error(`Invalid permission code(s): ${invalid.join(', ')}`);
    }
  }

  const user = await prisma.users.findUnique({
    where: { user_id: userId },
    select: { custom_fields: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const mergedCustomFields = mergeOverridesIntoCustomFields(user.custom_fields, {
    allow,
    deny,
  });

  await prisma.users.update({
    where: { user_id: userId },
    data: { custom_fields: mergedCustomFields },
  });

  return { allow, deny };
}

export async function getUserEffectivePermissions(
  prisma: PrismaClient,
  userId: string,
  userRole: string,
): Promise<PermissionInfo[]> {
  const rolePermissions = await getRolePermissions(prisma, userRole);
  const effectivePermissions = new Map(rolePermissions.map((p) => [p.code, p]));

  const userOverrides = await getUserPermissionOverrides(prisma, userId);

  if (userOverrides.allow.length > 0) {
    const allowPermissions = await prisma.permissions.findMany({
      where: { code: { in: userOverrides.allow } },
      select: {
        permission_id: true,
        code: true,
        name: true,
      },
    });

    for (const permission of allowPermissions) {
      effectivePermissions.set(permission.code, permission);
    }
  }

  for (const code of userOverrides.deny) {
    effectivePermissions.delete(code);
  }

  return Array.from(effectivePermissions.values());
}

/**
 * Kiểm tra xem User có quyền cụ thể hay không (dựa vào permission code)
 */
export async function hasPermission(
  prisma: PrismaClient,
  userId: string,
  userRole: string,
  permissionCode: string,
): Promise<boolean> {
  const effectivePermissions = await getUserEffectivePermissions(prisma, userId, userRole);

  return effectivePermissions.some((p) => p.code === permissionCode);
}

export async function hasAllPermissions(
  prisma: PrismaClient,
  userId: string,
  userRole: string,
  permissionCodes: string[],
): Promise<boolean> {
  const effectivePermissions = await getUserEffectivePermissions(prisma, userId, userRole);
  const effectivePermissionCodes = new Set(effectivePermissions.map((p) => p.code));

  return permissionCodes.every((code) => effectivePermissionCodes.has(code));
}

export async function hasAnyPermission(
  prisma: PrismaClient,
  userId: string,
  userRole: string,
  permissionCodes: string[],
): Promise<boolean> {
  const effectivePermissions = await getUserEffectivePermissions(prisma, userId, userRole);
  const effectivePermissionCodes = new Set(effectivePermissions.map((p) => p.code));

  return permissionCodes.some((code) => effectivePermissionCodes.has(code));
}

export async function addUserPermissionOverride(
  prisma: PrismaClient,
  userId: string,
  permissionCode: string,
  permissionType: 'allow' | 'deny',
) {
  const current = await getUserPermissionOverrides(prisma, userId);
  const allowSet = new Set(current.allow);
  const denySet = new Set(current.deny);

  if (permissionType === 'allow') {
    allowSet.add(permissionCode);
    denySet.delete(permissionCode);
  } else {
    denySet.add(permissionCode);
    allowSet.delete(permissionCode);
  }

  const updated = await setUserPermissionOverrides(prisma, userId, {
    allow: Array.from(allowSet),
    deny: Array.from(denySet),
  });

  return {
    user_id: userId,
    permission_code: permissionCode,
    permission_type: permissionType,
    allow: updated.allow,
    deny: updated.deny,
  };
}

export async function removeUserPermissionOverride(
  prisma: PrismaClient,
  userId: string,
  permissionCode: string,
): Promise<void> {
  const current = await getUserPermissionOverrides(prisma, userId);
  const allow = current.allow.filter((code) => code !== permissionCode);
  const deny = current.deny.filter((code) => code !== permissionCode);

  await setUserPermissionOverrides(prisma, userId, {
    allow,
    deny,
  });
}
