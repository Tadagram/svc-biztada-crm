import { FastifyInstance } from 'fastify';
import addPermissionHandler from '@handlers/permission';
import {
  getPermissionsHandler,
  updatePermissionHandler,
  deletePermissionHandler,
  checkPermissionHandler,
  checkAllPermissionsHandler,
  checkAnyPermissionHandler,
  getUserPermissionsHandler,
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
  fastify.post('/', { schema: addPermissionSchema }, addPermissionHandler);

  fastify.get('/', { schema: getPermissionsSchema }, getPermissionsHandler);

  fastify.put('/:permissionId', { schema: updatePermissionSchema }, updatePermissionHandler);

  fastify.delete('/:permissionId', { schema: deletePermissionSchema }, deletePermissionHandler);

  // ==================== Check Permissions ====================
  fastify.post('/check', { schema: checkPermissionSchema }, checkPermissionHandler);
  fastify.post('/check-all', { schema: checkAllPermissionsSchema }, checkAllPermissionsHandler);
  fastify.post('/check-any', { schema: checkAnyPermissionSchema }, checkAnyPermissionHandler);

  // ==================== User Permission Overrides ====================
  fastify.get('/user/:userId', { schema: getUserPermissionsSchema }, getUserPermissionsHandler);

  fastify.post(
    '/user/:userId/override',
    { schema: addUserPermissionOverrideSchema },
    addUserPermissionOverrideHandler,
  );

  fastify.delete(
    '/user/:userId/override',
    { schema: removeUserPermissionOverrideSchema },
    removeUserPermissionOverrideHandler,
  );
}

export default permissionRoutes;
