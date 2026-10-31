import { Hono } from 'hono';
import { NimegamiScraper } from '../scrapers/nimegami.ts';
import { sendSuccess, sendError } from '../utils/response.ts';
import { edgeCache } from '../utils/cache.ts';
import {
  SearchQuerySchema,
  PaginationQuerySchema,
  GenreQuerySchema,
} from '../types.ts';

export const nimegamiRoute = new Hono();
const scraper = new NimegamiScraper();
const PROVIDER_NAME = 'nimegami.id';

// GET /v1/nimegami/popular?page=1 or /v1/nimegami/trending?page=1
const handlePopular = async (c: any) => {
  const parsed = PaginationQuerySchema.safeParse(c.req.query());
  const page = parsed.success ? parsed.data.page : 1;

  try {
    const { items, hasNextPage } = await scraper.getPopular(page);
    return sendSuccess(c, items, {
      page,
      hasNextPage,
      totalResults: items.length,
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch popular anime from Nimegami';
    return sendError(c, msg, 500);
  }
};

nimegamiRoute.get('/popular', edgeCache({ ttl: 900 }), handlePopular);
nimegamiRoute.get('/trending', edgeCache({ ttl: 900 }), handlePopular);

// GET /v1/nimegami/latest?page=1
nimegamiRoute.get('/latest', edgeCache({ ttl: 180 }), async (c) => {
  const parsed = PaginationQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return sendError(c, 'Invalid pagination parameters', 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const { items, hasNextPage } = await scraper.getLatest(parsed.data.page);
    return sendSuccess(c, items, {
      page: parsed.data.page,
      hasNextPage,
      totalResults: items.length,
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch latest anime releases from Nimegami';
    return sendError(c, msg, 500);
  }
});

// GET /v1/nimegami/search?q=query&page=1
nimegamiRoute.get('/search', edgeCache({ ttl: 300 }), async (c) => {
  const parsed = SearchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return sendError(c, 'Invalid search parameters', 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const { items, hasNextPage } = await scraper.search(parsed.data.q, parsed.data.page);
    return sendSuccess(c, items, {
      query: parsed.data.q,
      page: parsed.data.page,
      hasNextPage,
      totalResults: items.length,
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to search anime from Nimegami';
    return sendError(c, msg, 500);
  }
});

// GET /v1/nimegami/detail/:slug
nimegamiRoute.get('/detail/:slug', edgeCache({ ttl: 1800 }), async (c) => {
  const slug = c.req.param('slug')?.trim();
  if (!slug) {
    return sendError(c, 'Anime slug is required', 400);
  }

  try {
    const detail = await scraper.getDetail(slug);
    return sendSuccess(c, detail, {
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to fetch details for anime: ${slug}`;
    const statusCode = msg.includes('not found') || msg.includes('Invalid') ? 404 : 500;
    return sendError(c, msg, statusCode);
  }
});

// GET /v1/nimegami/episode/:animeSlug/:episodeSlug
nimegamiRoute.get('/episode/:animeSlug/:episodeSlug', edgeCache({ ttl: 600 }), async (c) => {
  const animeSlug = c.req.param('animeSlug')?.trim();
  const episodeSlug = c.req.param('episodeSlug')?.trim();

  if (!animeSlug || !episodeSlug) {
    return sendError(c, 'Both anime slug and episode slug are required', 400);
  }

  try {
    const episode = await scraper.getEpisode(animeSlug, episodeSlug);
    return sendSuccess(c, episode, {
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch episode details from Nimegami';
    const statusCode = msg.includes('not found') ? 404 : 500;
    return sendError(c, msg, statusCode);
  }
});

// GET /v1/nimegami/episode/:slug (e.g. "mizu-zokusei-no-mahoutsukai-sub-indo/episode-1")
nimegamiRoute.get('/episode/:slug', edgeCache({ ttl: 600 }), async (c) => {
  const slug = c.req.param('slug')?.trim();
  if (!slug) {
    return sendError(c, 'Episode slug is required', 400);
  }

  try {
    const episode = await scraper.getEpisode(slug);
    return sendSuccess(c, episode, {
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to fetch episode: ${slug}`;
    const statusCode = msg.includes('not found') ? 404 : 500;
    return sendError(c, msg, statusCode);
  }
});

// GET /v1/nimegami/genres
nimegamiRoute.get('/genres', edgeCache({ ttl: 86400 }), async (c) => {
  try {
    const genres = await scraper.getGenres();
    return sendSuccess(c, genres, {
      totalResults: genres.length,
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch genres from Nimegami';
    return sendError(c, msg, 500);
  }
});

// GET /v1/nimegami/genres/:genreSlug or /v1/nimegami/genre/:genreSlug
const handleGenreFilter = async (c: any) => {
  const genreSlug = c.req.param('genreSlug')?.trim();
  if (!genreSlug) {
    return sendError(c, 'Genre slug is required', 400);
  }

  const parsed = GenreQuerySchema.safeParse(c.req.query());
  const page = parsed.success ? parsed.data.page : 1;

  try {
    const { items, hasNextPage } = await scraper.getByGenre(genreSlug, page);
    return sendSuccess(c, items, {
      genre: genreSlug,
      page,
      hasNextPage,
      totalResults: items.length,
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to fetch anime for genre: ${genreSlug}`;
    return sendError(c, msg, 500);
  }
};

nimegamiRoute.get('/genres/:genreSlug', edgeCache({ ttl: 900 }), handleGenreFilter);
nimegamiRoute.get('/genre/:genreSlug', edgeCache({ ttl: 900 }), handleGenreFilter);

// GET /v1/nimegami/batch/:slug
nimegamiRoute.get('/batch/:slug', edgeCache({ ttl: 1800 }), async (c) => {
  const slug = c.req.param('slug')?.trim();
  if (!slug) {
    return sendError(c, 'Anime slug is required', 400);
  }

  try {
    const batch = await scraper.getBatch(slug);
    return sendSuccess(c, batch, {
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to fetch batch downloads for: ${slug}`;
    return sendError(c, msg, 500);
  }
});
