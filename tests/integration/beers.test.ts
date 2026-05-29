import { describe, it, expect } from 'vitest';
import { BASE_URL } from '../helpers/config';

describe('GET /beers', () => {
  it('returns 200 with all 12 beers', async () => {
    const res = await fetch(`${BASE_URL}/beers`);
    expect(res.status).toBe(200);
    const { beers } = await res.json();
    expect(beers).toHaveLength(12);
  });

  it('each beer has required fields with correct types', async () => {
    const { beers } = await fetch(`${BASE_URL}/beers`).then((r) => r.json());
    for (const beer of beers) {
      expect(beer).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        bartender_preparation_time: expect.any(Number),
        volume: expect.any(Number),
        pour_time: expect.any(Number),
      });
    }
  });

  it('all prep times, volumes, and pour times are unique per spec', async () => {
    const { beers } = await fetch(`${BASE_URL}/beers`).then((r) => r.json());
    const unique = (arr: number[]) => new Set(arr).size === arr.length;
    expect(unique(beers.map((b: { bartender_preparation_time: number }) => b.bartender_preparation_time))).toBe(true);
    expect(unique(beers.map((b: { volume: number }) => b.volume))).toBe(true);
    expect(unique(beers.map((b: { pour_time: number }) => b.pour_time))).toBe(true);
  });
});
