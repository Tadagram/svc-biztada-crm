import { PrismaClient, Users, UserStatus, UserRole } from '@prisma/client';
import { JWT } from '@fastify/jwt';
import crypto from 'crypto';

const TIME_REFRESH_TOKEN = 7; // 7 ngày

export interface CreateUserBody {
  phone_number: string;
  agency_name?: string;
  parent_user_id?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserPayload {
  phone_number: string;
  role: UserRole;
  status: UserStatus;
  agency_name?: string;
  parent_user_id?: string;
}

export interface UserResponse {
  user_id: string;
  phone_number: string;
  agency_name: string | null;
  role: UserRole | null;
  status: UserStatus;
  created_at: Date;
}

export interface VerifyUserBody {
  phoneNumber: string;
}

export interface RefreshTokenResult {
  token: string;
  expiresAt: Date;
}

export async function createUserInDatabase(
  prisma: PrismaClient,
  payload: UserPayload,
): Promise<UserResponse> {
  const newUser = await prisma.users.create({
    data: payload,
    select: {
      user_id: true,
      phone_number: true,
      agency_name: true,
      role: true,
      status: true,
      created_at: true,
    },
  });

  return newUser;
}

export async function checkUserInSystem(
  prisma: PrismaClient,
  phoneNumber: string,
): Promise<Users | null> {
  return prisma.users.findFirst({
    where: {
      phone_number: phoneNumber,
      deleted_at: null,
    },
  });
}

export function generateAccessToken(jwt: JWT, user: Users, sessionId: string): string {
  return jwt.sign(
    {
      userId: user.user_id,
      role: user.role,
      agencyName: user.agency_name,
      parentUserId: user.parent_user_id,
      sessionId,
    },
    { expiresIn: '1h' },
  );
}

export function generateRefreshToken(): RefreshTokenResult {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TIME_REFRESH_TOKEN);

  return {
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt,
  };
}

export async function saveUserSession(
  prisma: PrismaClient,
  userId: string,
  refreshToken: string,
  expiresAt: Date,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string,
) {
  return await prisma.userSessions.create({
    data: {
      ...(sessionId ? { session_id: sessionId } : {}),
      user_id: userId,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
  });
}

export async function checkUserExists(
  prisma: PrismaClient,
  phoneNumber: string,
): Promise<Users | null> {
  return prisma.users.findFirst({
    where: { phone_number: phoneNumber },
  });
}
