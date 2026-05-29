import { describe, it, expect } from 'vitest';
import { BASE_URL } from '../helpers/config';

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
