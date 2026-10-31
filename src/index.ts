import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Scalar } from '@scalar/hono-api-reference';
import { healthRoute } from './routes/health.ts';
import { animexinRoute } from './routes/animexin.ts';
import { dramaidRoute } from './routes/dramaid.ts';
import { streamRoute } from './routes/stream.ts';
import { AnimexinScraper } from './scrapers/animexin.ts';
import { DramaIdScraper } from './scrapers/dramaid.ts';
import { extractUrl } from './extractors/index.ts';
import { sendSuccess, sendError } from './utils/response.ts';
import { edgeCache } from './utils/cache.ts';
import { SearchQuerySchema } from './types.ts';
import { openApiDocument } from './openapi.ts';
import { champagneCustomCss } from './theme/champagne.ts';

const app = new Hono();

// Global Middlewares
app.use('*', cors());
app.use('*', logger());

// Scalar Champagne Theme Configuration
const scalarChampagneConfig = {
  spec: {
    content: openApiDocument,
  },
  pageTitle: 'DeltaxApi - Interactive API Reference',
  theme: 'none' as const,
  layout: 'modern' as const,
  customCss: champagneCustomCss,
  documentDownloadType: 'none' as const,
  hideDownloadButton: true,
  hideTestRequestButton: false,
  withDefaultFonts: false,
};

// Interactive Scalar API Documentation
app.get('/docs', Scalar(scalarChampagneConfig));
app.get('/docs/', (c) => c.redirect('/docs'));
app.get('/reference', Scalar(scalarChampagneConfig));
app.get('/reference/', (c) => c.redirect('/reference'));

// Global raw OpenAPI 3.1 JSON specifications
app.get('/openapi.json', edgeCache({ ttl: 3600 }), (c) => c.json(openApiDocument));
app.get('/docs/openapi.json', edgeCache({ ttl: 3600 }), (c) => c.json(openApiDocument));

// Root endpoint: API documentation & metadata (or redirect browser to Scalar)
app.get('/', (c) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/html')) {
    return c.redirect('/docs');
  }

  return sendSuccess(c, {
    name: 'DeltaxApi',
    description: 'Donghua & Anime Scraper API for Animexin.dev and Asian Drama Scraper API for DramaID (dramaid.nimegami.id)',
    domain: 'api.deltax.bond',
    version: '1.0.0',
    documentation: {
      scalarDocs: 'https://api.deltax.bond/docs',
      scalarReference: 'https://api.deltax.bond/reference',
      openApiSchema: 'https://api.deltax.bond/openapi.json',
      health: ['GET /v1/health', 'GET /health'],
      streamProxy: 'GET /v1/stream/proxy?url=:mediaUrl&referer=:referer',
      extractor: 'GET /v1/extract?url=:videoEmbedUrl',
      search: 'GET /v1/:provider/search?q=:query&page=:page (e.g. /v1/animexin/search, /v1/dramaid/search)',
      animexin: {
        popular: 'GET /v1/animexin/popular?page=:page',
        trending: 'GET /v1/animexin/trending?page=:page',
        latest: 'GET /v1/animexin/latest?page=:page',
        search: 'GET /v1/animexin/search?q=:query&page=:page',
        detail: 'GET /v1/animexin/detail/:slug',
        episode: 'GET /v1/animexin/episode/:slug?extract=true|false',
        schedule: 'GET /v1/animexin/schedule',
        genres: 'GET /v1/animexin/genres',
        byGenre: 'GET /v1/animexin/genre/:slug?page=:page',
      },
      dramaid: {
        popular: 'GET /v1/dramaid/popular?page=:page',
        trending: 'GET /v1/dramaid/trending?page=:page',
        latest: 'GET /v1/dramaid/latest?page=:page',
        search: 'GET /v1/dramaid/search?q=:query&page=:page',
        detail: 'GET /v1/dramaid/detail/:slug',
        episode: 'GET /v1/dramaid/episode/:dramaSlug/:episodeSlug',
        genres: 'GET /v1/dramaid/genres',
        byGenre: 'GET /v1/dramaid/genre/:slug?page=:page',
        countries: 'GET /v1/dramaid/countries',
        byCountry: 'GET /v1/dramaid/country/:slug?page=:page',
      },
    },
  });
});

// Health check endpoints
app.route('/v1', healthRoute);
app.route('/', healthRoute);

// Provider routes
app.route('/v1/animexin', animexinRoute);
app.route('/v1/dramaid', dramaidRoute);
app.route('/v1/stream', streamRoute);

// Dedicated stream extractor endpoint: GET /v1/extract?url=...
app.get('/v1/extract', edgeCache({ ttl: 600 }), async (c) => {
  const url = c.req.query('url')?.trim();
  if (!url) {
    return sendError(c, 'Query parameter "url" is required for stream extraction', 400);
  }

  try {
    const streams = await extractUrl(url);
    return sendSuccess(c, streams, {
      totalResults: streams.length,
      targetUrl: url,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to extract video streams';
    return sendError(c, msg, 500);
  }
});

// Provider-based non-unified search
const animexinScraper = new AnimexinScraper();
const dramaidScraper = new DramaIdScraper();

async function handleProviderSearch(c: any, provider: string) {
  const parsed = SearchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return sendError(c, 'Invalid search parameters', 400, parsed.error.flatten().fieldErrors);
  }

  const query = parsed.data.q;
  const page = parsed.data.page;

  if (provider === 'animexin') {
    try {
      const res = await animexinScraper.search(query, page);
      return sendSuccess(c, res.items, {
        provider: 'animexin.dev',
        query,
        page,
        hasNextPage: res.hasNextPage,
        totalResults: res.items.length,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search Animexin';
      return sendError(c, msg, 500);
    }
  }

  if (provider === 'dramaid') {
    try {
      const res = await dramaidScraper.search(query, page);
      return sendSuccess(c, res.items, {
        provider: 'dramaid.nimegami.id',
        query,
        page,
        hasNextPage: res.hasNextPage,
        totalResults: res.items.length,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search DramaID';
      return sendError(c, msg, 500);
    }
  }

  return sendError(
    c,
    `Unknown provider "${provider}". Supported providers: animexin, dramaid. Example: /v1/dramaid/search?q=${encodeURIComponent(query)}`,
    400
  );
}

// GET /v1/:provider/search?q=:query&page=:page
app.get('/v1/:provider/search', edgeCache({ ttl: 300 }), async (c) => {
  const provider = c.req.param('provider').toLowerCase();
  return handleProviderSearch(c, provider);
});

// Non-unified search fallback: GET /v1/search?provider=:provider&q=:query&page=:page
app.get('/v1/search', edgeCache({ ttl: 300 }), async (c) => {
  const providerParam = c.req.query('provider')?.trim().toLowerCase();
  if (!providerParam || providerParam === 'all') {
    return sendError(
      c,
      'Unified search is disabled. Please specify a provider via /v1/:provider/search?q=:query (e.g., /v1/animexin/search)',
      400
    );
  }

  return handleProviderSearch(c, providerParam);
});

// Custom 404 handler
app.notFound((c) => {
  return sendError(
    c,
    `Endpoint not found: ${c.req.method} ${c.req.path}. Visit GET / for API documentation.`,
    404
  );
});

// Custom error handler
app.onError((err, c) => {
  console.error('Unhandled server error:', err);
  return sendError(
    c,
    err instanceof Error ? err.message : 'Internal Server Error',
    500
  );
});

export default app;
