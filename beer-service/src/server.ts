import * as grpc from '@grpc/grpc-js';
import { BeerServiceService } from './proto/beer';
import { beerServiceImpl } from './services/beer.service';
import { logger } from './logger';

const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = process.env.PORT ?? '50051';

const server = new grpc.Server();
server.addService(BeerServiceService, beerServiceImpl);

server.bindAsync(`${HOST}:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    logger.error(err, 'Failed to start BeerService');
    process.exit(1);
  }
  logger.info({ port }, 'BeerService listening');
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
