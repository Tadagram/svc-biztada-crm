import { Prisma } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getPortalLicenseById, renewPortalLicense } from '@services/corePortalLicenses';

interface RenewLicenseKeyParams {
  keyId: string;
}

function addOneMonth(base: Date): Date {
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export async function handler(
  request: FastifyRequest<{ Params: RenewLicenseKeyParams }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const caller = request.user;
  const { keyId } = request.params;

  // 1. Lay thong tin key tu core-api (kiem tra ownership qua buyer_user_id)
  let licenseKey;
  try {
    licenseKey = await getPortalLicenseById(keyId, caller.userId);
  } catch (err) {
    const msg = getErrorMessage(err);
    if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
      return reply
        .status(403)
        .send({ success: false, message: 'Key nay khong thuoc ve tai khoan cua ban.' });
    }
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return reply.status(404).send({ success: false, message: 'Khong tim thay license key.' });
    }
    return reply.status(502).send({ success: false, message: msg });
  }

  // 2. Key phai da duoc kich hoat (co used_by_portal_id)
  if (!licenseKey.used_by_portal_id) {
    return reply.status(400).send({
      success: false,
      message: 'Key chua duoc kich hoat. Vui long nhap key tren Worker Portal App truoc.',
    });
  }

  // 3. Server-side check: key phai het han moi gia han
  const currentExpiresAt = licenseKey.expires_at ? new Date(licenseKey.expires_at) : null;

  // Key unlimited (expires_at = NULL) => khong can gia han, chan lai tranh convert thanh time-limited
  if (!currentExpiresAt) {
    return reply.status(400).send({
      success: false,
      message: 'Key nay la unlimited (khong co thoi han). Khong can gia han.',
    });
  }

  if (currentExpiresAt.getTime() > Date.now()) {
    return reply.status(400).send({
      success: false,
      message: `Key van con han den ${currentExpiresAt.toLocaleDateString('vi-VN')}. Chi gia han khi key da het han.`,
    });
  }

  // 4. Tim package price qua issued_for_note
  let packagePrice: Prisma.Decimal | null = null;
  let packageName = 'Unknown Package';

  const noteRef = licenseKey.issued_for_note;
  if (noteRef) {
    const match = noteRef.match(/crm_purchase[:#/-]([0-9a-fA-F-]{36})/);
    const purchaseId = match?.[1];
    if (purchaseId) {
      const purchase = await prisma.servicePackagePurchases.findUnique({
        where: { service_package_purchase_id: purchaseId },
        include: { service_package: true },
      });
      if (purchase?.service_package) {
        // Tinh gia per-key: package_price / so_luong_key_da_mua
        // Dung license_key_count_snapshot de tranh thay doi gia neu package update sau nay
        const keyCount = purchase.license_key_count_snapshot;
        const rawPrice = new Prisma.Decimal(purchase.service_package.price_per_month);
        packagePrice = keyCount > 1 ? rawPrice.div(new Prisma.Decimal(keyCount)) : rawPrice;
        packageName = purchase.service_package.product_code ?? packageName;
      }
    }
  }

  if (!packagePrice) {
    return reply.status(400).send({
      success: false,
      message: 'Khong the xac dinh gia goi. Vui long lien he ho tro.',
    });
  }

  // 5. new_expires_at = max(expires_at, now) + 1 thang
  const baseDate =
    currentExpiresAt && currentExpiresAt.getTime() > Date.now() ? currentExpiresAt : new Date();
  const newExpiresAt = addOneMonth(baseDate);

  // 6. Tru balance
  try {
    await prisma.$transaction(async (tx: any) => {
      const user = await tx.users.findUnique({
        where: { user_id: caller.userId },
        select: { balance: true },
      });
      if (!user) throw new Error('User not found.');
      if (Number(user.balance) < Number(packagePrice)) {
        throw new Error(`So du khong du. Can $${packagePrice} USD, hien co $${user.balance} USD.`);
      }
      await tx.users.update({
        where: { user_id: caller.userId },
        data: { balance: { decrement: packagePrice } },
      });
    });
  } catch (err) {
    return reply.status(400).send({ success: false, message: getErrorMessage(err) });
  }

  // 7. Goi core-api cap nhat expires_at tren portal_license_keys
  //    Portal heartbeat ke tiep se thay han moi ngay — khong can nhap lai key.
  try {
    await renewPortalLicense(keyId, newExpiresAt.toISOString());
  } catch (err) {
    // Hoan tien neu gia han that bai
    try {
      await prisma.users.update({
        where: { user_id: caller.userId },
        data: { balance: { increment: packagePrice } },
      });
    } catch (rollbackErr) {
      request.log.error(
        { err: rollbackErr, keyId, userId: caller.userId },
        'Failed to refund balance after license renew failure',
      );
    }
    return reply.status(502).send({ success: false, message: getErrorMessage(err) });
  }

  const updatedUser = await prisma.users
    .findUnique({
      where: { user_id: caller.userId },
      select: { balance: true },
    })
    .catch(() => null);

  return reply.status(200).send({
    success: true,
    data: {
      core_license_key_id: keyId,
      package_name: packageName,
      new_expires_at: newExpiresAt.toISOString(),
      price_paid_usd: (packagePrice as Prisma.Decimal).toString(),
      remaining_balance_usd: updatedUser?.balance?.toString() ?? '0',
    },
  });
}
