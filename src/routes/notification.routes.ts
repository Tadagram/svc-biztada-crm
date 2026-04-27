import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markReadHandler,
  markAllReadHandler,
  createNotificationHandler,
  streamNotificationsHandler,
} from '@handlers/notification';
import {
  getNotificationsSchema,
  getUnreadCountSchema,
  markReadSchema,
  markAllReadSchema,
  createNotificationSchema,
  streamNotificationsSchema,
} from '@schemas/notification.schema';

async function notificationRoutes(fastify: FastifyInstance) {
  // GET /notifications/stream — realtime notifications for current user
  fastify.get(
    '/stream',
    {
      schema: streamNotificationsSchema,
      preHandler: [
        async (request, reply) => {
          const query = request.query as { token?: string };
          if (query.token && !request.headers.authorization) {
            request.headers.authorization = `Bearer ${query.token}`;
          }
          await fastify.authenticate(request, reply);
        },
      ],
    },
    streamNotificationsHandler as RouteHandlerMethod,
  );

  // GET /notifications — list my notifications (paginated, filterable)
  fastify.get(
    '/',
    {
      schema: getNotificationsSchema,
      preHandler: [fastify.authenticate],
    },
    getNotificationsHandler as RouteHandlerMethod,
  );

  // GET /notifications/unread-count — badge count
  fastify.get(
    '/unread-count',
    {
      schema: getUnreadCountSchema,
      preHandler: [fastify.authenticate],
    },
    getUnreadCountHandler as RouteHandlerMethod,
  );

  // PATCH /notifications/read-all — mark all as read
  fastify.patch(
    '/read-all',
    {
      schema: markAllReadSchema,
      preHandler: [fastify.authenticate],
    },
    markAllReadHandler as RouteHandlerMethod,
  );

  // PATCH /notifications/:notificationId/read — mark single as read
  fastify.patch(
    '/:notificationId/read',
    {
      schema: markReadSchema,
      preHandler: [fastify.authenticate],
    },
    markReadHandler as RouteHandlerMethod,
  );

  // POST /notifications — MOD only
  fastify.post(
    '/',
    {
      schema: createNotificationSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('users:update')],
    },
    createNotificationHandler as RouteHandlerMethod,
  );
}

export default notificationRoutes;
