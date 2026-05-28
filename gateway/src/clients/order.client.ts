import * as grpc from '@grpc/grpc-js';
import type { ClientReadableStream } from '@grpc/grpc-js';
import { OrderServiceClient, PlaceOrderRequest, OrderEvent } from '../proto/order';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL ?? 'order-service:50052';

const client = new OrderServiceClient(ORDER_SERVICE_URL, grpc.credentials.createInsecure());

export function placeOrder(request: PlaceOrderRequest, correlationId: string): ClientReadableStream<OrderEvent> {
  const metadata = new grpc.Metadata();
  metadata.set('x-correlation-id', correlationId);
  return client.placeOrder(request, metadata);
}
