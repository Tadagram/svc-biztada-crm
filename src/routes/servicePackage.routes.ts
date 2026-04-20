import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { handler as listServicePackagesHandler } from '@handlers/servicePackage/listServicePackagesHandler';
import { listServicePackagesSchema } from '@schemas/servicePackage.schema';

async function servicePackageRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: listServicePackagesSchema,
      preHandler: [fastify.authenticate],
    },
    listServicePackagesHandler as RouteHandlerMethod,
  );
}

export default servicePackageRoutes;
