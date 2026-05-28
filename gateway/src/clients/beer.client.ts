import * as grpc from '@grpc/grpc-js';
import { BeerServiceClient, Beer } from '../proto/beer';

const BEER_SERVICE_URL = process.env.BEER_SERVICE_URL ?? 'beer-service:50051';
const DEADLINE_MS = 5000;

const client = new BeerServiceClient(BEER_SERVICE_URL, grpc.credentials.createInsecure());

export function getAllBeers(correlationId: string): Promise<Beer[]> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('x-correlation-id', correlationId);
    const options: grpc.CallOptions = { deadline: new Date(Date.now() + DEADLINE_MS) };

    client.getBeers({}, metadata, options, (err, response) => {
      if (err) return reject(err);
      resolve(response?.beers ?? []);
    });
  });
}
