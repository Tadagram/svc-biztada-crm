import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { hasPermission } from '@handlers/permission/permissionHelper';
import { UserRole } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    requirePermission: (
      code: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function rbacPlugin(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.decorate(
    'requirePermission',
    (code: string) =>
      async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const caller = request.user;

        // null role = full admin
        if (caller.role === null) {
          return;
        }

        // mod has admin-like access except topup review
        if (caller.role === UserRole.mod) {
          if (code === 'topup:review') {
            reply.status(403).send({
              success: false,
              message: 'Forbidden: mod không được truy cập duyệt nạp tiền.',
            });
          }
          return;
        }

        const allowed = await hasPermission(
          request.server.prisma,
          caller.userId,
          caller.role,
          code,
        );

        if (!allowed) {
          reply.status(403).send({
            success: false,
            message: 'Forbidden: bạn không có quyền thực hiện thao tác này.',
          });
        }
      },
  );

  fastify.log.info('🛡️  RBAC Plugin: requirePermission decorator registered.');
}

export default fp(rbacPlugin);
