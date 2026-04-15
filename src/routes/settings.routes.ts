import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getQRCodeHandler, uploadQRCodeHandler } from '@handlers/settings';
import { getQRCodeSchema, uploadQRCodeSchema } from '@schemas/settings.schema';

async function settingsRoutes(fastify: FastifyInstance) {
  // GET /settings/qr-code — public, no auth
  fastify.get('/qr-code', { schema: getQRCodeSchema }, getQRCodeHandler as RouteHandlerMethod);

  // POST /settings/qr-code — mod only
  fastify.post(
    '/qr-code',
    {
      schema: uploadQRCodeSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('settings:manage')],
    },
    uploadQRCodeHandler as RouteHandlerMethod,
  );
}

export default settingsRoutes;
