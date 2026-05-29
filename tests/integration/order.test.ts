import { describe, it, expect } from 'vitest';
import { collectNdjsonStream } from '../helpers/stream';
import { BASE_URL } from '../helpers/config';

function placeOrder(items: { beer_id: number; quantity: number }[]) {
  return fetch(`${BASE_URL}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}

describe('POST /order — validation', () => {
  it('rejects quantity > 20 with 400', async () => {
    const res = await placeOrder([{ beer_id: 1, quantity: 99 }]);
    expect(res.status).toBe(400);
  });

  it('rejects unknown beer_id with 400', async () => {
    const res = await placeOrder([{ beer_id: 999, quantity: 1 }]);
    expect(res.status).toBe(400);
  });

  it('rejects empty items array with 400', async () => {
    const res = await fetch(`${BASE_URL}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing body with 400', async () => {
    const res = await fetch(`${BASE_URL}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /order — streaming', () => {
  it('streams beer_ready events then order_complete', async () => {
    // Pilsner (1+4=5s), Heineken x2 (2+5=7s)
    const res = await placeOrder([
      { beer_id: 1, quantity: 1 },
      { beer_id: 2, quantity: 2 },
    ]);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('ndjson');

    const events = await collectNdjsonStream(res);

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ event: 'beer_ready', beer_id: 1, beer_name: 'Pilsner Urquell', quantity: 1 });
    expect(events[1]).toMatchObject({ event: 'beer_ready', beer_id: 2, beer_name: 'Heineken', quantity: 2 });
    expect(events[2]).toMatchObject({ event: 'order_complete', total_beers: 3 });
    expect(typeof (events[2] as { order_id: string }).order_id).toBe('string');
  });

  it('events arrive fastest-first regardless of request order', async () => {
    // Hoegaarden (9+3=12s) ordered first, Pilsner (1+4=5s) ordered second
    // Pilsner must arrive first — proves concurrent pouring
    const res = await placeOrder([
      { beer_id: 9, quantity: 1 },
      { beer_id: 1, quantity: 1 },
    ]);

    const events = await collectNdjsonStream(res);
    const beerReady = events.filter((e) => e.event === 'beer_ready');

    expect(beerReady[0]).toMatchObject({ beer_id: 1, beer_name: 'Pilsner Urquell' });
    expect(beerReady[1]).toMatchObject({ beer_id: 9, beer_name: 'Hoegaarden' });
  });

  it('order_complete is always the last event', async () => {
    const res = await placeOrder([{ beer_id: 1, quantity: 1 }]);
    const events = await collectNdjsonStream(res);
    expect(events.at(-1)).toMatchObject({ event: 'order_complete' });
  });

  it('correlation ID is present in response headers', async () => {
    const res = await placeOrder([{ beer_id: 1, quantity: 1 }]);
    await collectNdjsonStream(res);
    expect(res.headers.get('x-correlation-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
