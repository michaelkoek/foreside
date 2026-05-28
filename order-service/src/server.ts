import * as grpc from '@grpc/grpc-js';
import { OrderServiceService } from './proto/order';
import { orderServiceImpl } from './services/order.service';
import { logger } from './logger';

const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = process.env.PORT ?? '50052';

const server = new grpc.Server();
server.addService(OrderServiceService, orderServiceImpl);

server.bindAsync(`${HOST}:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    logger.error(err, 'Failed to start OrderService');
    process.exit(1);
  }
  logger.info({ port }, 'OrderService listening');
});

function shutdown() {
  logger.info('Shutting down');
  server.tryShutdown((err) => {
    if (err) logger.error(err, 'Shutdown error');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
