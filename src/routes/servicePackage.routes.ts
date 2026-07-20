import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { handler as listServicePackagesHandler } from '@handlers/servicePackage/listServicePackagesHandler';
import { handler as purchaseServicePackageHandler } from '@handlers/servicePackage/purchaseServicePackageHandler';
import { handler as listServicePackagePurchasesHandler } from '@handlers/servicePackage/listServicePackagePurchasesHandler';
import { handler as createServicePackageHandler } from '@handlers/servicePackage/createServicePackageHandler';
import { handler as updateServicePackageHandler } from '@handlers/servicePackage/updateServicePackageHandler';
import { handler as deleteServicePackageHandler } from '@handlers/servicePackage/deleteServicePackageHandler';
import {
  listServicePackagesSchema,
  purchaseServicePackageSchema,
  listServicePackagePurchasesSchema,
  createServicePackageSchema,
  updateServicePackageSchema,
  deleteServicePackageSchema,
} from '@schemas/servicePackage.schema';

async function servicePackageRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { schema: listServicePackagesSchema, preHandler: [fastify.authenticate] },
    listServicePackagesHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/purchase',
    { schema: purchaseServicePackageSchema, preHandler: [fastify.authenticate] },
    purchaseServicePackageHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/',
    {
      schema: createServicePackageSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('topup:review')],
    },
    createServicePackageHandler as RouteHandlerMethod,
  );

  fastify.patch(
    '/:servicePackageId',
    {
      schema: updateServicePackageSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('topup:review')],
    },
    updateServicePackageHandler as RouteHandlerMethod,
  );

  fastify.delete(
    '/:servicePackageId',
    {
      schema: deleteServicePackageSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('topup:review')],
    },
    deleteServicePackageHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/purchases',
    { schema: listServicePackagePurchasesSchema, preHandler: [fastify.authenticate] },
    listServicePackagePurchasesHandler as RouteHandlerMethod,
  );
}

export default servicePackageRoutes;
