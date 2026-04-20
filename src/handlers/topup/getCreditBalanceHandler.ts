import { FastifyRequest, FastifyReply } from 'fastify';

function normalizePhone(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('tg_')) return trimmed;
  return trimmed.replace(/\D/g, '');
}

function buildPhoneVariants(input?: string | null): string[] {
  const raw = (input ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('tg_')) return [raw];

  const digits = normalizePhone(raw);
  if (!digits) return [raw];

  const variants = new Set<string>([raw, digits, `+${digits}`]);

  if (digits.startsWith('84')) {
    const local = `0${digits.slice(2)}`;
    variants.add(local);
    variants.add(`+${local}`);
  }

  if (digits.startsWith('0')) {
    const intl = `84${digits.slice(1)}`;
    variants.add(intl);
    variants.add(`+${intl}`);
  }

  return Array.from(variants).filter(Boolean);
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const prisma = request.prisma as any;
  const caller = request.user;

  const callerUser = await prisma.users.findUnique({
    where: { user_id: caller.userId },
    select: { user_id: true, phone_number: true },
  });

  const aliasUsers = callerUser?.phone_number
    ? await prisma.users.findMany({
        where: {
          phone_number: {
            in: buildPhoneVariants(callerUser.phone_number),
          },
        },
        select: { user_id: true },
      })
    : [];

  const userIds = Array.from(
    new Set([caller.userId, ...aliasUsers.map((user: { user_id: string }) => user.user_id)]),
  );

  const balances = await prisma.userCreditBalances.findMany({
    where: { user_id: { in: userIds } },
    select: { user_id: true, available_credits: true, updated_at: true },
  });

  const totalCredits = balances.reduce(
    (sum: number, item: { available_credits: { toString?: () => string } }) =>
      sum + Number(item.available_credits?.toString?.() ?? 0),
    0,
  );

  const latestUpdatedAt = balances
    .map((item: { updated_at: Date | null }) => item.updated_at)
    .filter(Boolean)
    .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

  const matchedPrimary = balances.find(
    (item: { user_id: string }) => item.user_id === caller.userId,
  );
  const effectiveUserId = matchedPrimary?.user_id ?? balances[0]?.user_id ?? caller.userId;

  return reply.send({
    success: true,
    data: {
      user_id: effectiveUserId,
      available_credits: totalCredits.toFixed(2),
      updated_at: latestUpdatedAt?.toISOString?.() ?? null,
    },
  });
}
