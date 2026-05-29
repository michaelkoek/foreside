import { BASE_URL } from './helpers/config';

const MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 1_000;

export async function setup() {
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`Gateway not reachable at ${BASE_URL} after ${MAX_WAIT_MS / 1000}s — is Docker Compose running?`);
}
