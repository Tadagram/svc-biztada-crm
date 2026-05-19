import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  getPromotionSettingsHandler,
  updatePromotionSettingsHandler,
  listEligibleUsersHandler,
  listPromotionsHandler,
  createPromotionHandler,
  getPromotionHandler,
  updatePromotionHandler,
  deletePromotionHandler,
  executePromotionHandler,
} from '@handlers/promotion';
import {
  getPromotionSettingsSchema,
  updatePromotionSettingsSchema,
  listEligibleUsersSchema,
  listPromotionsSchema,
  createPromotionSchema,
  getPromotionSchema,
  updatePromotionSchema,
  deletePromotionSchema,
  executePromotionSchema,
} from '@schemas/promotion.schema';

async function promotionRoutes(fastify: FastifyInstance) {
  const adminOnly = [fastify.authenticate, fastify.requirePermission('promotions:manage')];

  // GET /promotions/settings — get new-user bonus config
  fastify.get(
    '/settings',
    {
      schema: getPromotionSettingsSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('promotions:manage')],
    },
    getPromotionSettingsHandler as RouteHandlerMethod,
  );

  // PUT /promotions/settings — update new-user bonus config
  fastify.put(
    '/settings',
    {
      schema: updatePromotionSettingsSchema,
      preHandler: adminOnly,
    },
    updatePromotionSettingsHandler as RouteHandlerMethod,
  );

  // GET /promotions/eligible-users — list users with total spend filter
  fastify.get(
    '/eligible-users',
    {
      schema: listEligibleUsersSchema,
      preHandler: adminOnly,
    },
    listEligibleUsersHandler as RouteHandlerMethod,
  );

  // GET /promotions — list event promotions
  fastify.get(
    '/',
    {
      schema: listPromotionsSchema,
      preHandler: adminOnly,
    },
    listPromotionsHandler as RouteHandlerMethod,
  );

  // POST /promotions — create promotion
  fastify.post(
    '/',
    {
      schema: createPromotionSchema,
      preHandler: adminOnly,
    },
    createPromotionHandler as RouteHandlerMethod,
  );

  // GET /promotions/:promotionId — get single promotion
  fastify.get(
    '/:promotionId',
    {
      schema: getPromotionSchema,
      preHandler: adminOnly,
    },
    getPromotionHandler as RouteHandlerMethod,
  );

  // PUT /promotions/:promotionId — update promotion
  fastify.put(
    '/:promotionId',
    {
      schema: updatePromotionSchema,
      preHandler: adminOnly,
    },
    updatePromotionHandler as RouteHandlerMethod,
  );

  // DELETE /promotions/:promotionId — delete promotion
  fastify.delete(
    '/:promotionId',
    {
      schema: deletePromotionSchema,
      preHandler: adminOnly,
    },
    deletePromotionHandler as RouteHandlerMethod,
  );

  // POST /promotions/:promotionId/execute — execute promotion
  fastify.post(
    '/:promotionId/execute',
    {
      schema: executePromotionSchema,
      preHandler: adminOnly,
    },
    executePromotionHandler as RouteHandlerMethod,
  );
}

export default promotionRoutes;
