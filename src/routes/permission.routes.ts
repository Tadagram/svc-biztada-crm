import { FastifyInstance } from 'fastify';
import addPermissionHandler from '@handlers/permission';
import {
  addPermissionSchema,
  checkPermissionSchema,
  checkAllPermissionsSchema,
  checkAnyPermissionSchema,
  getUserPermissionsSchema,
  addUserPermissionOverrideSchema,
  removeUserPermissionOverrideSchema,
} from '@schemas/permission.schema';
import {
  checkPermissionHandler,
  checkAllPermissionsHandler,
  checkAnyPermissionHandler,
  getUserPermissionsHandler,
  addUserPermissionOverrideHandler,
  removeUserPermissionOverrideHandler,
} from '@handlers/permission';

async function permissionRoutes(fastify: FastifyInstance) {
  // ==================== Create Permission ====================
  fastify.post(
    '/',
    {
      schema: addPermissionSchema,
    },
    addPermissionHandler,
  );

  // ==================== Check Permissions ====================
  fastify.post(
    '/check',
    {
      schema: checkPermissionSchema,
    },
    checkPermissionHandler,
  );

  fastify.post(
    '/check-all',
    {
      schema: checkAllPermissionsSchema,
    },
    checkAllPermissionsHandler,
  );

  fastify.post(
    '/check-any',
    {
      schema: checkAnyPermissionSchema,
    },
    checkAnyPermissionHandler,
  );

  // ==================== User Permissions ====================
  fastify.get(
    '/user/:userId',
    {
      schema: getUserPermissionsSchema,
    },
    getUserPermissionsHandler,
  );

  fastify.post(
    '/user/:userId/override',
    {
      schema: addUserPermissionOverrideSchema,
    },
    addUserPermissionOverrideHandler,
  );

  fastify.delete(
    '/user/:userId/override',
    {
      schema: removeUserPermissionOverrideSchema,
    },
    removeUserPermissionOverrideHandler,
  );
}

export default permissionRoutes;
