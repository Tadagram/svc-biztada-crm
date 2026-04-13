import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  createUserHandler,
  getUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  deleteUserHandler,
} from '@handlers/user';
import {
  createUserSchema,
  getUsersSchema,
  getUserByIdSchema,
  updateUserSchema,
  deleteUserSchema,
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
  fastify.put(
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
}

export default userRoutes;
