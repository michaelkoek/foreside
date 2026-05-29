import * as grpc from '@grpc/grpc-js';
import { ServerWritableStream } from '@grpc/grpc-js';
import { OrderServiceServer, PlaceOrderRequest, OrderEvent } from '../proto/order';
import { getBeersByIds } from '../clients/beer.client';
import { logger } from '../logger';

async function handlePlaceOrder(call: ServerWritableStream<PlaceOrderRequest, OrderEvent>): Promise<void> {
  const { items, correlation_id } = call.request;
  const log = logger.child({ correlation_id });

  if (items.length === 0) {
    call.destroy(Object.assign(new Error('Order must contain at least one item'), { code: grpc.status.INVALID_ARGUMENT }));
    return;
  }

  log.info({ items }, 'Order received');

  const beerIds = [...new Set(items.map((i) => i.beer_id))];
  const beers = await getBeersByIds(beerIds, correlation_id);
  const beerMap = new Map(beers.map((b) => [b.id, b]));

  const pourPromises = items.map((item) => {
    const beer = beerMap.get(item.beer_id);

    if (!beer) {
      log.warn({ beer_id: item.beer_id }, 'Unknown beer ID, skipping');
      return Promise.resolve();
    }

    const totalMs = (beer.bartender_preparation_time + beer.pour_time) * 1000;

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        if (call.destroyed) return resolve();

        try {
          call.write({
            beer_ready: {
              beer_id: beer.id,
              beer_name: beer.name,
              quantity: item.quantity,
            },
          });
          log.info({ beer_id: beer.id, beer_name: beer.name, quantity: item.quantity }, 'Beer ready');
        } catch (err) {
          log.warn({ beer_id: beer.id, err }, 'Failed to write beer_ready — client disconnected');
        }

        resolve();
      }, totalMs);
    });
  });

  await Promise.all(pourPromises);

  if (call.destroyed) return;

  const total_beers = items.reduce((sum, i) => sum + i.quantity, 0);

  log.info({ total_beers }, 'Order complete');

  try {
    call.write({
      order_complete: {
        order_id: crypto.randomUUID(),
        beers: items
          .filter((i) => beerMap.has(i.beer_id))
          .map((i) => ({
            beer_id: i.beer_id,
            beer_name: beerMap.get(i.beer_id)!.name,
            quantity: i.quantity,
          })),
        total_beers,
      },
    });
  } catch (err) {
    log.warn({ err }, 'Failed to write order_complete — client disconnected');
    return;
  }

  call.end();
}

export const orderServiceImpl: OrderServiceServer = {
  placeOrder(call: ServerWritableStream<PlaceOrderRequest, OrderEvent>): void {
    handlePlaceOrder(call).catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(error, 'Unhandled error in placeOrder');
      if (!call.destroyed) call.destroy(error);
    });
  },
};
