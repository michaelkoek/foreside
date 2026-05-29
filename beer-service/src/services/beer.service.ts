import * as grpc from '@grpc/grpc-js';
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js';
import { BeerServiceServer, GetBeersRequest, GetBeersResponse, GetBeersByIdsRequest } from '../proto/beer';
import { beers, beersById } from '../data/beers';
import { logger } from '../logger';

export const beerServiceImpl: BeerServiceServer = {
  getBeers(call: ServerUnaryCall<GetBeersRequest, GetBeersResponse>, callback: sendUnaryData<GetBeersResponse>): void {
    const correlation_id = call.metadata.get('x-correlation-id')[0] ?? 'unknown';
    logger.child({ correlation_id }).info('GetBeers called');
    callback(null, { beers });
  },

  getBeersByIds(call: ServerUnaryCall<GetBeersByIdsRequest, GetBeersResponse>, callback: sendUnaryData<GetBeersResponse>): void {
    const { ids } = call.request;
    const correlation_id = call.metadata.get('x-correlation-id')[0] ?? 'unknown';
    const log = logger.child({ correlation_id });

    const invalidIds = ids.filter((id) => !beersById.has(id));
    if (invalidIds.length > 0) {
      log.warn({ invalidIds }, 'GetBeersByIds called with unknown IDs');
      callback({ code: grpc.status.INVALID_ARGUMENT, message: `Unknown beer IDs: ${invalidIds.join(', ')}` }, null);
      return;
    }

    log.info({ ids }, 'GetBeersByIds called');
    const found = ids.map((id) => beersById.get(id)).filter((b): b is NonNullable<typeof b> => b !== undefined);
    callback(null, { beers: found });
  },
};
