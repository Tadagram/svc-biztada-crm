import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import fastifyCompress from '@fastify/compress';

async function compressionPlugin(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.register(fastifyCompress);
}

export default fp(compressionPlugin);
