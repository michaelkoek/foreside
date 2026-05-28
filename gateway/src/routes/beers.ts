import type { FastifyInstance } from 'fastify';
import { getAllBeers } from '../clients/beer.client';

export async function beerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/beers', async (request, reply) => {
    const correlationId = crypto.randomUUID();
    request.log.info({ correlationId }, 'GET /beers');

    try {
      const beers = await getAllBeers(correlationId);
      return reply.send({ beers });
    } catch (err) {
      request.log.error({ correlationId, err }, 'BeerService unavailable');
      return reply.status(502).send({ error: 'Beer service unavailable' });
    }
  });
}
