import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import addPermissionHandler from '@handlers/permission';
import {
  getPermissionsHandler,
  updatePermissionHandler,
  deletePermissionHandler,
  checkPermissionHandler,
  checkAllPermissionsHandler,
  checkAnyPermissionHandler,
  getUserPermissionsHandler,
  getCurrentUserPermissionsHandler,
  addUserPermissionOverrideHandler,
  removeUserPermissionOverrideHandler,
} from '@handlers/permission';
import {
  addPermissionSchema,
  getPermissionsSchema,
  updatePermissionSchema,
  deletePermissionSchema,
  checkPermissionSchema,
  checkAllPermissionsSchema,
  checkAnyPermissionSchema,
  getUserPermissionsSchema,
  addUserPermissionOverrideSchema,
  removeUserPermissionOverrideSchema,
} from '@schemas/permission.schema';

async function permissionRoutes(fastify: FastifyInstance) {
  // ==================== Permission CRUD ====================
  fastify.post(
    '/',
    {
      schema: addPermissionSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('permissions:create')],
    },
    addPermissionHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/',
    {
      schema: getPermissionsSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('permissions:read')],
    },
    getPermissionsHandler as RouteHandlerMethod,
  );

  fastify.put(
    '/:permissionId',
    {
      schema: updatePermissionSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('permissions:update')],
    },
    updatePermissionHandler as RouteHandlerMethod,
  );

  fastify.delete(
    '/:permissionId',
    {
      schema: deletePermissionSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('permissions:delete')],
    },
    deletePermissionHandler as RouteHandlerMethod,
  );

  // ==================== Check Permissions (chỉ cần auth) ====================
  fastify.post(
    '/check',
    { schema: checkPermissionSchema, preHandler: [fastify.authenticate] },
    checkPermissionHandler as RouteHandlerMethod,
  );
  fastify.post(
    '/check-all',
    { schema: checkAllPermissionsSchema, preHandler: [fastify.authenticate] },
    checkAllPermissionsHandler as RouteHandlerMethod,
  );
  fastify.post(
    '/check-any',
    { schema: checkAnyPermissionSchema, preHandler: [fastify.authenticate] },
    checkAnyPermissionHandler as RouteHandlerMethod,
  );

  // ==================== Current User Permissions ====================
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    getCurrentUserPermissionsHandler as RouteHandlerMethod,
  );

  // ==================== User Permission Overrides ====================
  fastify.get(
    '/user/:userId',
    { schema: getUserPermissionsSchema, preHandler: [fastify.authenticate] },
    getUserPermissionsHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/user/:userId/override',
    {
      schema: addUserPermissionOverrideSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('permissions:manage_overrides')],
    },
    addUserPermissionOverrideHandler as RouteHandlerMethod,
  );

  fastify.delete(
    '/user/:userId/override',
    {
      schema: removeUserPermissionOverrideSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('permissions:manage_overrides')],
    },
    removeUserPermissionOverrideHandler as RouteHandlerMethod,
  );
}

export default permissionRoutes;
