import { FastifyInstance } from 'fastify';
import addPermissionHandler from '@handlers/addPermission';
import { addPermissionSchema } from '@schemas/permission.schema';

async function permissionRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      schema: addPermissionSchema,
    },
    addPermissionHandler,
  );
}

export default permissionRoutes;
