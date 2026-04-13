import { FastifyInstance } from 'fastify';
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
    },
    createUserHandler,
  );

  // Get all users
  fastify.get(
    '/',
    {
      schema: getUsersSchema,
    },
    getUsersHandler,
  );

  // Get user by ID
  fastify.get(
    '/:userId',
    {
      schema: getUserByIdSchema,
    },
    getUserByIdHandler,
  );

  // Update user
  fastify.put(
    '/:userId',
    {
      schema: updateUserSchema,
    },
    updateUserHandler,
  );

  // Delete user
  fastify.delete(
    '/:userId',
    {
      schema: deleteUserSchema,
    },
    deleteUserHandler,
  );
}

export default userRoutes;
