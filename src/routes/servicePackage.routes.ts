import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { handler as listServicePackagesHandler } from '@handlers/servicePackage/listServicePackagesHandler';
import { handler as purchaseServicePackageHandler } from '@handlers/servicePackage/purchaseServicePackageHandler';
import { handler as listServicePackagePurchasesHandler } from '@handlers/servicePackage/listServicePackagePurchasesHandler';
import { handler as listPurchasedLicenseKeysHandler } from '@handlers/servicePackage/listPurchasedLicenseKeysHandler';
import { handler as renewLicenseKeyHandler } from '@handlers/servicePackage/renewLicenseKeyHandler';
import { handler as createServicePackageHandler } from '@handlers/servicePackage/createServicePackageHandler';
import { handler as updateServicePackageHandler } from '@handlers/servicePackage/updateServicePackageHandler';
import { handler as deleteServicePackageHandler } from '@handlers/servicePackage/deleteServicePackageHandler';
import {
  listServicePackagesSchema,
  purchaseServicePackageSchema,
  listServicePackagePurchasesSchema,
  listPurchasedLicenseKeysSchema,
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

  fastify.get(
    '/license-keys',
    { schema: listPurchasedLicenseKeysSchema, preHandler: [fastify.authenticate] },
    listPurchasedLicenseKeysHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/license-keys/:keyId/renew',
    { preHandler: [fastify.authenticate] },
    renewLicenseKeyHandler as RouteHandlerMethod,
  );
}

export default servicePackageRoutes;
