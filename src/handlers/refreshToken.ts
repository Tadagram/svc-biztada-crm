import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

const TOKEN_REFRESH_EXPIRY = 7;

async function handler(
  request: FastifyRequest<{ Body: { refreshToken?: string } }>,
  reply: FastifyReply,
) {
  const { prisma, log: logger } = request;
  const { jwt } = request.server;

  try {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, message: 'Token không tồn tại.' });
    }

    const expiredToken = authHeader.slice(7);

    let decoded: { userId: string; role: string; sessionId: string };
    try {
      decoded = jwt.verify<{ userId: string; role: string; sessionId: string }>(expiredToken, {
        ignoreExpiration: true,
      });
    } catch {
      return reply.status(401).send({ success: false, message: 'Token không hợp lệ.' });
    }

    if (!decoded.sessionId) {
      return reply
        .status(401)
        .send({ success: false, message: 'Token không chứa thông tin phiên.' });
    }

    // ── 3. Find session in DB by sessionId ──
    const session = await prisma.userSessions.findUnique({
      where: { session_id: decoded.sessionId },
      include: { user: true },
    });

    if (!session) {
      return reply.status(401).send({ success: false, message: 'Phiên đăng nhập không tồn tại.' });
    }

    const providedRefreshToken = request.body?.refreshToken;
    if (providedRefreshToken && providedRefreshToken !== session.refresh_token) {
      return reply.status(401).send({ success: false, message: 'Refresh token không hợp lệ.' });
    }

    // ── 4. Check if refresh token is expired → delete session & logout ──
    if (session.expires_at < new Date()) {
      await prisma.userSessions.delete({ where: { session_id: session.session_id } });
      return reply
        .status(401)
        .send({ success: false, message: 'Phiên đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    // ── 5. Rotate refresh token & generate new access token ──
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + TOKEN_REFRESH_EXPIRY);

    await prisma.userSessions.update({
      where: { session_id: session.session_id },
      data: {
        refresh_token: newRefreshToken,
        expires_at: newExpiresAt,
      },
    });

    const token = jwt.sign(
      {
        userId: session.user.user_id,
        role: session.user.role,
        agencyName: session.user.agency_name,
        parentUserId: session.user.parent_user_id,
        sessionId: session.session_id,
      },
      { expiresIn: '1h' },
    );

    return reply.send({
      success: true,
      message: 'Làm mới Token thành công.',
      token,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error({ err: error }, '[RefreshTokenHandler] Error');
    return reply.status(500).send({ success: false, message: 'Lỗi xác thực Token.' });
  }
}

export default handler;
