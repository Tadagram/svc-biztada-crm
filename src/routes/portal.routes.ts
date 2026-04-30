import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { listPortalsHandler, transferPortalHandler } from '@handlers/portal';

/**
 * portalRoutes — Admin portal device management.
 *
 * All routes require authentication.  Transfer action additionally requires
 * the 'portals:manage' permission (admin/mod only).
 *
 * Prefix registered in routes/index.ts: /portals
 */
async function portalRoutes(fastify: FastifyInstance) {
  // GET /portals
  // Returns paginated list of ALL portal devices across all users.
  // Query: page, limit, user_id, telegram_id, status, portal_type, search
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission('portals:read')],
    },
    listPortalsHandler as RouteHandlerMethod,
  );

  // POST /portals/transfer
  // Migrate a portal to a new physical machine (update mac_address, invalidate old session).
  // Body: { portal_id, new_mac_address, new_device_name?, clear_installed_workers? }
  fastify.post(
    '/transfer',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission('portals:manage')],
    },
    transferPortalHandler as RouteHandlerMethod,
  );
}

export default portalRoutes;
