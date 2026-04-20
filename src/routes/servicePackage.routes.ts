import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { handler as listServicePackagesHandler } from '@handlers/servicePackage/listServicePackagesHandler';
import { handler as purchaseServicePackageHandler } from '@handlers/servicePackage/purchaseServicePackageHandler';
import { handler as listServicePackagePurchasesHandler } from '@handlers/servicePackage/listServicePackagePurchasesHandler';
import { handler as listPurchasedLicenseKeysHandler } from '@handlers/servicePackage/listPurchasedLicenseKeysHandler';
import {
  listServicePackagesSchema,
  purchaseServicePackageSchema,
  listServicePackagePurchasesSchema,
  listPurchasedLicenseKeysSchema,
} from '@schemas/servicePackage.schema';

async function servicePackageRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: listServicePackagesSchema,
      preHandler: [fastify.authenticate],
    },
    listServicePackagesHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/purchase',
    {
      schema: purchaseServicePackageSchema,
      preHandler: [fastify.authenticate],
    },
    purchaseServicePackageHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/purchases',
    {
      schema: listServicePackagePurchasesSchema,
      preHandler: [fastify.authenticate],
    },
    listServicePackagePurchasesHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/license-keys',
    {
      schema: listPurchasedLicenseKeysSchema,
      preHandler: [fastify.authenticate],
    },
    listPurchasedLicenseKeysHandler as RouteHandlerMethod,
  );
}

export default servicePackageRoutes;
