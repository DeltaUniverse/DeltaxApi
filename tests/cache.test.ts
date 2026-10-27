import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { edgeCache } from '../src/utils/cache.ts';
import app from '../src/index.ts';

test('Cache Middleware: sets Cache-Control and X-Cache headers on 200 response', async () => {
  const testApp = new Hono();
  testApp.get('/test-route', edgeCache({ ttl: 300, staleWhileRevalidate: 60 }), (c) => {
    return c.json({ ok: true });
  });

  const res = await testApp.request('/test-route');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
  assert.equal(res.headers.get('x-cache'), 'MISS');
});

test('Cache Middleware: does not cache non-200 responses', async () => {
  const testApp = new Hono();
  testApp.get('/error-route', edgeCache({ ttl: 300 }), (c) => {
    return c.json({ error: 'not found' }, 404);
  });

  const res = await testApp.request('/error-route');
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('cache-control'), null);
  assert.equal(res.headers.get('x-cache'), null);
});

test('Cache Middleware: matches cached response in Cache API (X-Cache: HIT)', async () => {
  const store = new Map<string, Response>();
  const mockCache = {
    match: async (req: Request) => {
      const res = store.get(req.url);
      return res ? res.clone() : undefined;
    },
    put: async (req: Request, res: Response) => {
      store.set(req.url, res.clone());
    },
  };

  (globalThis as any).caches = { default: mockCache };

  try {
    let callCount = 0;
    const testApp = new Hono();
    testApp.get('/cached-route', edgeCache({ ttl: 600 }), (c) => {
      callCount++;
      return c.json({ count: callCount });
    });

    // 1st request -> MISS
    const res1 = await testApp.request('/cached-route');
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('x-cache'), 'MISS');
    const json1 = await res1.json() as { count: number };
    assert.equal(json1.count, 1);
    assert.equal(callCount, 1);

    // 2nd request -> HIT
    const res2 = await testApp.request('/cached-route');
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get('x-cache'), 'HIT');
    const json2 = await res2.json() as { count: number };
    assert.equal(json2.count, 1);
    assert.equal(callCount, 1);
  } finally {
    delete (globalThis as any).caches;
  }
});

test('App Endpoints: /openapi.json has edge cache headers', async () => {
  const res = await app.request('/openapi.json');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60');
  assert.equal(res.headers.get('x-cache'), 'MISS');
});

test('App Endpoints: /v1/animexin/popular has edge cache headers', async () => {
  const res = await app.request('/v1/animexin/popular?page=1');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=900, s-maxage=900, stale-while-revalidate=60');
  assert.equal(res.headers.get('x-cache'), 'MISS');
});
