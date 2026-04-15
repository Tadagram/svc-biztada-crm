import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  createUserHandler,
  getUsersHandler,
  getUserByIdHandler,
  getCurrentUserHandler,
  updateUserHandler,
  updateProfileHandler,
  deleteUserHandler,
  getUserSummaryHandler,
} from '@handlers/user';
import {
  createUserSchema,
  getUsersSchema,
  getUserByIdSchema,
  updateUserSchema,
  deleteUserSchema,
  getUserSummarySchema,
} from '@schemas/user.schema';

async function userRoutes(fastify: FastifyInstance) {
  // Create user
  fastify.post(
    '/',
    {
      schema: createUserSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('users:create')],
    },
    createUserHandler as RouteHandlerMethod,
  );

  // Get own profile
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
    },
    getCurrentUserHandler as RouteHandlerMethod,
  );

  // Update own profile (no permission required beyond authentication)
  fastify.put(
    '/me',
    {
      preHandler: [fastify.authenticate],
    },
    updateProfileHandler as RouteHandlerMethod,
  );

  // Get all users
  fastify.get(
    '/',
    {
      schema: getUsersSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('users:read')],
    },
    getUsersHandler as RouteHandlerMethod,
  );

  // Get user by ID
  fastify.get(
    '/:userId',
    {
      schema: getUserByIdSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('users:read')],
    },
    getUserByIdHandler as RouteHandlerMethod,
  );

  // Update user
  fastify.patch(
    '/:userId',
    {
      schema: updateUserSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('users:update')],
    },
    updateUserHandler as RouteHandlerMethod,
  );

  // Delete user
  fastify.delete(
    '/:userId',
    {
      schema: deleteUserSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('users:delete')],
    },
    deleteUserHandler as RouteHandlerMethod,
  );

  // Get user engagement summary (must be after /:userId to avoid conflict — but it IS after)
  fastify.get(
    '/:userId/summary',
    {
      schema: getUserSummarySchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('users:read')],
    },
    getUserSummaryHandler as RouteHandlerMethod,
  );
}

export default userRoutes;
