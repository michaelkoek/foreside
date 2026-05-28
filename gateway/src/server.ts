import Fastify from 'fastify';
import { beerRoutes } from './routes/beers';
import { orderRoutes } from './routes/order';

const fastify = Fastify({
  logger: {
    name: 'gateway',
    level: process.env.LOG_LEVEL ?? 'info',
  },
});

fastify.get('/health', async () => ({ status: 'ok' }));
fastify.register(beerRoutes);
fastify.register(orderRoutes);

const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = Number(process.env.PORT ?? 3000);

const start = async () => {
  try {
    await fastify.listen({ host: HOST, port: PORT });
  } catch (err) {
    fastify.log.error(err, 'Failed to start gateway');
    process.exit(1);
  }
};

const shutdown = async () => {
  fastify.log.info('Shutting down');
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
