import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js';
import { BeerServiceServer, GetBeersRequest, GetBeersResponse, GetBeersByIdsRequest } from '../proto/beer';
import { beers, beersById } from '../data/beers';
import { logger } from '../logger';

export const beerServiceImpl: BeerServiceServer = {
  getBeers(_call: ServerUnaryCall<GetBeersRequest, GetBeersResponse>, callback: sendUnaryData<GetBeersResponse>): void {
    logger.info('GetBeers called');
    callback(null, { beers });
  },

  getBeersByIds(call: ServerUnaryCall<GetBeersByIdsRequest, GetBeersResponse>, callback: sendUnaryData<GetBeersResponse>): void {
    const { ids } = call.request;
    logger.info({ ids }, 'GetBeersByIds called');

    const found = ids.map((id) => beersById.get(id)).filter((b): b is NonNullable<typeof b> => b !== undefined);
    callback(null, { beers: found });
  },
};
