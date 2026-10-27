import type { MiddlewareHandler, Context } from 'hono';

export interface CacheOptions {
  /**
   * Cache duration in seconds.
   */
  ttl: number;
  /**
   * Stale-while-revalidate duration in seconds (defaults to 60s).
   */
  staleWhileRevalidate?: number;
  /**
   * Optional custom cache key generator. Defaults to the canonical request URL.
   */
  keyGenerator?: (c: Context) => string;
}

/**
 * Returns the default Cloudflare Workers Cache instance if available.
 */
function getCloudflareCache(): any {
  if (typeof caches !== 'undefined' && caches && 'default' in caches) {
    return (caches as any).default;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).caches && 'default' in (globalThis as any).caches) {
    return (globalThis as any).caches.default;
  }
  return null;
}

/**
 * Cloudflare Cache API middleware for Hono on Cloudflare Workers.
 * Leverages `caches.default` to cache GET responses at the edge.
 */
export function edgeCache(options: CacheOptions): MiddlewareHandler {
  const { ttl, staleWhileRevalidate = 60, keyGenerator } = options;

  return async function edgeCacheMiddleware(c, next) {
    // Only cache GET requests without authorization headers
    if (c.req.method !== 'GET' || c.req.header('authorization')) {
      return next();
    }

    const cache = getCloudflareCache();
    const cacheKeyUrl = keyGenerator ? keyGenerator(c) : c.req.url;

    // Check edge cache if Cloudflare Cache API is present
    if (cache) {
      try {
        const cacheKey = new Request(cacheKeyUrl, {
          method: 'GET',
          headers: c.req.raw.headers,
        });

        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          const res = new Response(cachedResponse.body, cachedResponse);
          res.headers.set('X-Cache', 'HIT');
          return res;
        }
      } catch (err) {
        console.warn('Cache lookup error:', err);
      }
    }

    await next();

    // Only cache successful 200 responses
    if (c.res.status !== 200) {
      return;
    }

    // Set standard edge & browser cache headers
    const cacheControlValue = `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${staleWhileRevalidate}`;
    c.header('Cache-Control', cacheControlValue);
    c.header('X-Cache', 'MISS');

    // Store response into Cloudflare Cache API
    if (cache) {
      try {
        const cacheKey = new Request(cacheKeyUrl, {
          method: 'GET',
          headers: c.req.raw.headers,
        });

        const responseToCache = c.res.clone();
        const putPromise = cache.put(cacheKey, responseToCache);

        let executionCtx: any = null;
        try {
          executionCtx = c.executionCtx;
        } catch {
          executionCtx = null;
        }

        if (executionCtx && typeof executionCtx.waitUntil === 'function') {
          executionCtx.waitUntil(putPromise);
        } else {
          await putPromise;
        }
      } catch (err) {
        console.warn('Cache store error:', err);
      }
    }
  };
}
