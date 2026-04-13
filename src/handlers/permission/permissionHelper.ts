import { PrismaClient, PermissionType } from '@prisma/client';

export interface PermissionInfo {
  permission_id: string;
  code: string;
  name: string;
}

export interface UserPermissionOverride {
  permission_id: string;
  code: string;
  name: string;
  permission_type: 'allow' | 'deny';
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

/**
 * Lấy danh sách các quyền ngoại lệ (Overrides) của User
 */
export async function getUserPermissionOverrides(
  prisma: PrismaClient,
  userId: string,
): Promise<UserPermissionOverride[]> {
  const userPermissions = await prisma.userPermissions.findMany({
    where: {
      user_id: userId,
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

  return userPermissions.map((up) => ({
    permission_id: up.permission.permission_id,
    code: up.permission.code,
    name: up.permission.name,
    permission_type: up.permission_type,
  }));
}

export async function getUserEffectivePermissions(
  prisma: PrismaClient,
  userId: string,
  userRole: string,
): Promise<PermissionInfo[]> {
  const rolePermissions = await getRolePermissions(prisma, userRole);
  const rolePermissionMap = new Map(rolePermissions.map((p) => [p.permission_id, p]));

  const userOverrides = await getUserPermissionOverrides(prisma, userId);

  const effectivePermissions = new Map(Array.from(rolePermissionMap.entries()));

  for (const override of userOverrides) {
    if (override.permission_type === PermissionType.allow) {
      effectivePermissions.set(override.permission_id, {
        permission_id: override.permission_id,
        code: override.code,
        name: override.name,
      });
    } else if (override.permission_type === PermissionType.deny) {
      effectivePermissions.delete(override.permission_id);
    }
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
  permissionType: PermissionType,
) {
  const permission = await prisma.permissions.findUnique({
    where: { code: permissionCode },
  });

  if (!permission) {
    throw new Error(`Permission with code '${permissionCode}' not found`);
  }

  const existingOverride = await prisma.userPermissions.findFirst({
    where: {
      user_id: userId,
      permission_id: permission.permission_id,
    },
  });

  if (existingOverride) {
    return await prisma.userPermissions.update({
      where: {
        user_permission_id: existingOverride.user_permission_id,
      },
      data: {
        permission_type: permissionType,
      },
    });
  }

  return await prisma.userPermissions.create({
    data: {
      user_id: userId,
      permission_id: permission.permission_id,
      permission_type: permissionType,
    },
  });
}

export async function removeUserPermissionOverride(
  prisma: PrismaClient,
  userId: string,
  permissionCode: string,
): Promise<void> {
  const permission = await prisma.permissions.findUnique({
    where: { code: permissionCode },
  });

  if (!permission) {
    throw new Error(`Permission with code '${permissionCode}' not found`);
  }

  await prisma.userPermissions.deleteMany({
    where: {
      user_id: userId,
      permission_id: permission.permission_id,
    },
  });
}
