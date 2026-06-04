import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { registerGuestHandler, loginGuestHandler } from '@handlers/strategyGuest';
import { generateAiTextHandler } from '@handlers/strategyAi';
import { registerGuestSchema, loginGuestSchema } from '@schemas/strategyGuest.schema';
import { getMarketProfileHandler, upsertMarketProfileHandler } from '@handlers/strategyMarket';
import { getMarketProfileSchema, upsertMarketProfileSchema } from '@schemas/strategyMarket.schema';
import { getActionPlanHandler, upsertActionPlanHandler } from '@handlers/strategyPlan';
import { getActionPlanSchema, upsertActionPlanSchema } from '@schemas/strategyPlan.schema';
import { getFeaturesHandler, upsertFeaturesHandler } from '@handlers/strategyFeatures';
import { getFeaturesSchema, upsertFeaturesSchema } from '@schemas/strategyFeatures.schema';
import { getMatrixHandler, upsertMatrixHandler } from '@handlers/strategyMatrix';
import { getMatrixSchema, upsertMatrixSchema } from '@schemas/strategyMatrix.schema';
import { getFactoryHandler, upsertFactoryHandler } from '@handlers/strategyFactory';
import { getFactorySchema, upsertFactorySchema } from '@schemas/strategyFactory.schema';
import { getSeedingHandler, upsertSeedingHandler } from '@handlers/strategySeeding';
import { getSeedingSchema, upsertSeedingSchema } from '@schemas/strategySeeding.schema';
import { getContentEngineHandler, upsertContentEngineHandler } from '@handlers/strategyContentEngine';
import { getContentEngineSchema, upsertContentEngineSchema } from '@schemas/strategyContentEngine.schema';
import { getSocialAmplificationHandler, upsertSocialAmplificationHandler } from '@handlers/strategySocialAmplification';
import { getSocialAmplificationSchema, upsertSocialAmplificationSchema } from '@schemas/strategySocialAmplification.schema';
import { getConversionGatewayHandler, upsertConversionGatewayHandler } from '@handlers/strategyConversionGateway';
import { getConversionGatewaySchema, upsertConversionGatewaySchema } from '@schemas/strategyConversionGateway.schema';
import { getPipelineEngineHandler, upsertPipelineEngineHandler } from '@handlers/strategyPipelineEngine';
import { getPipelineEngineSchema, upsertPipelineEngineSchema } from '@schemas/strategyPipelineEngine.schema';
import { getLoyaltyLoopHandler, upsertLoyaltyLoopHandler } from '@handlers/strategyLoyaltyLoop';
import { getLoyaltyLoopSchema, upsertLoyaltyLoopSchema } from '@schemas/strategyLoyaltyLoop.schema';
import { getContentNetworkHandler, upsertContentNetworkHandler } from '@handlers/strategyContentNetwork';
import { getContentNetworkSchema, upsertContentNetworkSchema } from '@schemas/strategyContentNetwork.schema';
import { getDirectionHandler, upsertDirectionHandler } from '@handlers/strategyDirection';
import { getDirectionSchema, upsertDirectionSchema } from '@schemas/strategyDirection.schema';
import { consultHandler, feedbackHandler, historyHandler, claimGuestHandler } from '@handlers/strategySession';
import { consultSchema, feedbackSchema, historySchema, claimGuestSchema } from '@schemas/strategySession.schema';

async function strategyRoutes(fastify: FastifyInstance) {
  // Allow raw text/plain bodies for the AI endpoint.
  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

  // Public endpoint: register guest user (phone + businessName → guestId)
  fastify.post(
    '/guest',
    { schema: registerGuestSchema },
    registerGuestHandler as RouteHandlerMethod,
  );

  // Public endpoint: login as existing guest (phone lookup → guestId + businessName)
  fastify.get(
    '/guest',
    { schema: loginGuestSchema },
    loginGuestHandler as RouteHandlerMethod,
  );

  // Public endpoint: AI text generation for strategy guests.
  // Accepts text/plain prompt, returns text/plain AI response.
  fastify.post('/ai', generateAiTextHandler as RouteHandlerMethod);

  // Public endpoint: no auth required.
  // If user/business context is missing, handler returns demo dataset.
  fastify.get(
    '/strategic-direction',
    { schema: getDirectionSchema },
    getDirectionHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/strategic-direction',
    { schema: upsertDirectionSchema },
    upsertDirectionHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/market-profile',
    { schema: getMarketProfileSchema },
    getMarketProfileHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/market-profile',
    { schema: upsertMarketProfileSchema },
    upsertMarketProfileHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/action-plan',
    { schema: getActionPlanSchema },
    getActionPlanHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/action-plan',
    { schema: upsertActionPlanSchema },
    upsertActionPlanHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/features',
    { schema: getFeaturesSchema },
    getFeaturesHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/features',
    { schema: upsertFeaturesSchema },
    upsertFeaturesHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/matrix',
    { schema: getMatrixSchema },
    getMatrixHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/matrix',
    { schema: upsertMatrixSchema },
    upsertMatrixHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/factory',
    { schema: getFactorySchema },
    getFactoryHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/factory',
    { schema: upsertFactorySchema },
    upsertFactoryHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/seeding',
    { schema: getSeedingSchema },
    getSeedingHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/seeding',
    { schema: upsertSeedingSchema },
    upsertSeedingHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/content-engine',
    { schema: getContentEngineSchema },
    getContentEngineHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/content-engine',
    { schema: upsertContentEngineSchema },
    upsertContentEngineHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/social-amplification',
    { schema: getSocialAmplificationSchema },
    getSocialAmplificationHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/social-amplification',
    { schema: upsertSocialAmplificationSchema },
    upsertSocialAmplificationHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/conversion-gateway',
    { schema: getConversionGatewaySchema },
    getConversionGatewayHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/conversion-gateway',
    { schema: upsertConversionGatewaySchema },
    upsertConversionGatewayHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/pipeline-engine',
    { schema: getPipelineEngineSchema },
    getPipelineEngineHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/pipeline-engine',
    { schema: upsertPipelineEngineSchema },
    upsertPipelineEngineHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/loyalty-loop',
    { schema: getLoyaltyLoopSchema },
    getLoyaltyLoopHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/loyalty-loop',
    { schema: upsertLoyaltyLoopSchema },
    upsertLoyaltyLoopHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/content-network',
    { schema: getContentNetworkSchema },
    getContentNetworkHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/content-network',
    { schema: upsertContentNetworkSchema },
    upsertContentNetworkHandler as RouteHandlerMethod,
  );

  // ── RAG Consult + Session Logging ────────────────────────────────────────
  // Calls svc-ai-controller internal endpoint; logs session for authenticated users.
  fastify.post(
    '/consult',
    { schema: consultSchema },
    consultHandler as RouteHandlerMethod,
  );

  // Save 1–5 feedback score for a past consult session.
  fastify.post(
    '/feedback',
    { schema: feedbackSchema },
    feedbackHandler as RouteHandlerMethod,
  );

  // Paginated consult session history for a user or guest.
  fastify.get(
    '/session-history',
    { schema: historySchema },
    historyHandler as RouteHandlerMethod,
  );

  // Claim guest strategy data for a newly registered user.
  // Atomic migration: all 5 strategy tables + session logs + soft-delete guest.
  fastify.post(
    '/claim-guest',
    { schema: claimGuestSchema },
    claimGuestHandler as RouteHandlerMethod,
  );
}
export default strategyRoutes;
