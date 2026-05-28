import type { FastifyInstance } from 'fastify';
import { placeOrder } from '../clients/order.client';
import type { OrderEvent } from '../proto/order';

interface OrderItem {
  beer_id: number;
  quantity: number;
}

interface OrderBody {
  items: OrderItem[];
}

const orderSchema = {
  body: {
    type: 'object',
    required: ['items'],
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          required: ['beer_id', 'quantity'],
          additionalProperties: false,
          properties: {
            beer_id: { type: 'integer', minimum: 1 },
            quantity: { type: 'integer', minimum: 1, maximum: 20 },
          },
        },
      },
    },
  },
};

function translateEvent(event: OrderEvent): Record<string, unknown> {
  if (event.beer_ready) {
    return {
      event: 'beer_ready',
      beer_id: event.beer_ready.beer_id,
      beer_name: event.beer_ready.beer_name,
      quantity: event.beer_ready.quantity,
    };
  }
  if (event.order_complete) {
    return {
      event: 'order_complete',
      order_id: event.order_complete.order_id,
      total_beers: event.order_complete.total_beers,
      beers: event.order_complete.beers,
    };
  }
  return {};
}

export async function orderRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: OrderBody }>('/order', { schema: orderSchema }, async (request, reply) => {
    const correlationId = crypto.randomUUID();
    const { items } = request.body;

    request.log.info({ correlationId, items }, 'POST /order');

    reply.raw.setHeader('Content-Type', 'application/x-ndjson');
    reply.raw.setHeader('X-Correlation-Id', correlationId);
    reply.hijack();
    reply.raw.writeHead(200);

    const grpcStream = placeOrder({ items, correlation_id: correlationId }, correlationId);

    await new Promise<void>((resolve) => {
      grpcStream.on('data', (event: OrderEvent) => {
        reply.raw.write(JSON.stringify(translateEvent(event)) + '\n');
      });

      grpcStream.on('end', () => {
        reply.raw.end();
        resolve();
      });

      grpcStream.on('error', (err: Error) => {
        request.log.error({ correlationId, err }, 'OrderService stream error');
        reply.raw.end();
        resolve();
      });
    });
  });
}
