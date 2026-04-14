import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markReadHandler,
  markAllReadHandler,
  deleteNotificationHandler,
  createNotificationHandler,
} from '@handlers/notification';
import {
  getNotificationsSchema,
  getUnreadCountSchema,
  markReadSchema,
  markAllReadSchema,
  deleteNotificationSchema,
  createNotificationSchema,
} from '@schemas/notification.schema';

async function notificationRoutes(fastify: FastifyInstance) {
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

  // DELETE /notifications/:notificationId
  fastify.delete(
    '/:notificationId',
    {
      schema: deleteNotificationSchema,
      preHandler: [fastify.authenticate],
    },
    deleteNotificationHandler as RouteHandlerMethod,
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
