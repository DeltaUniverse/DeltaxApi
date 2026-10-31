import { Hono } from 'hono';
import { DramaIdScraper } from '../scrapers/dramaid.ts';
import { sendSuccess, sendError } from '../utils/response.ts';
import { edgeCache } from '../utils/cache.ts';
import {
  SearchQuerySchema,
  PaginationQuerySchema,
  GenreQuerySchema,
  CountryQuerySchema,
} from '../types.ts';

export const dramaidRoute = new Hono();
const scraper = new DramaIdScraper();
const PROVIDER_NAME = 'dramaid.nimegami.id';

// GET /v1/dramaid/popular?page=1 or /v1/dramaid/trending?page=1
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
    const msg = err instanceof Error ? err.message : 'Failed to fetch popular dramas from DramaID';
    return sendError(c, msg, 500);
  }
};

dramaidRoute.get('/popular', edgeCache({ ttl: 900 }), handlePopular);
dramaidRoute.get('/trending', edgeCache({ ttl: 900 }), handlePopular);

// GET /v1/dramaid/latest?page=1
dramaidRoute.get('/latest', edgeCache({ ttl: 180 }), async (c) => {
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
    const msg = err instanceof Error ? err.message : 'Failed to fetch latest releases from DramaID';
    return sendError(c, msg, 500);
  }
});

// GET /v1/dramaid/search?q=love&page=1
dramaidRoute.get('/search', edgeCache({ ttl: 300 }), async (c) => {
  const parsed = SearchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return sendError(c, 'Invalid search query parameters', 400, parsed.error.flatten().fieldErrors);
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
    const msg = err instanceof Error ? err.message : 'Failed to search DramaID';
    return sendError(c, msg, 500);
  }
});

// GET /v1/dramaid/detail/:slug
dramaidRoute.get('/detail/:slug', edgeCache({ ttl: 1800 }), async (c) => {
  const slug = c.req.param('slug')?.trim();
  if (!slug) {
    return sendError(c, 'Drama slug is required', 400);
  }

  try {
    const detail = await scraper.getDetail(slug);
    return sendSuccess(c, detail, { provider: PROVIDER_NAME });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to get drama details for ${slug}`;
    return sendError(c, msg, 404);
  }
});

// GET /v1/dramaid/episode/:dramaSlug/:episodeSlug
dramaidRoute.get('/episode/:dramaSlug/:episodeSlug', edgeCache({ ttl: 600 }), async (c) => {
  const dramaSlug = c.req.param('dramaSlug')?.trim();
  const episodeSlug = c.req.param('episodeSlug')?.trim();

  if (!dramaSlug || !episodeSlug) {
    return sendError(c, 'Both drama slug and episode slug are required', 400);
  }

  try {
    const episode = await scraper.getEpisode(dramaSlug, episodeSlug);
    return sendSuccess(c, episode, { provider: PROVIDER_NAME });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to get episode stream for ${dramaSlug}/${episodeSlug}`;
    return sendError(c, msg, 404);
  }
});

// GET /v1/dramaid/episode/:slug (supports single slug with / or ?url=...)
dramaidRoute.get('/episode/:slug', edgeCache({ ttl: 600 }), async (c) => {
  const slug = c.req.param('slug')?.trim();
  const queryUrl = c.req.query('url')?.trim();
  const target = queryUrl || slug;

  if (!target) {
    return sendError(c, 'Episode slug or URL is required', 400);
  }

  try {
    const episode = await scraper.getEpisode(target);
    return sendSuccess(c, episode, { provider: PROVIDER_NAME });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to get episode stream for ${target}`;
    return sendError(c, msg, 404);
  }
});

// GET /v1/dramaid/genres
dramaidRoute.get('/genres', edgeCache({ ttl: 86400 }), async (c) => {
  try {
    const genres = await scraper.getGenres();
    return sendSuccess(c, genres, { provider: PROVIDER_NAME, totalResults: genres.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch genres from DramaID';
    return sendError(c, msg, 500);
  }
});

// GET /v1/dramaid/genre/:slug?page=1
dramaidRoute.get('/genre/:slug', edgeCache({ ttl: 900 }), async (c) => {
  const slug = c.req.param('slug')?.trim();
  if (!slug) {
    return sendError(c, 'Genre slug is required', 400);
  }

  const parsed = GenreQuerySchema.safeParse(c.req.query());
  const page = parsed.success ? parsed.data.page : 1;

  try {
    const { items, hasNextPage } = await scraper.getByGenre(slug, page);
    return sendSuccess(c, items, {
      genre: slug,
      page,
      hasNextPage,
      totalResults: items.length,
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to fetch dramas in genre ${slug}`;
    return sendError(c, msg, 500);
  }
});

// GET /v1/dramaid/countries
dramaidRoute.get('/countries', edgeCache({ ttl: 86400 }), async (c) => {
  try {
    const countries = await scraper.getCountries();
    return sendSuccess(c, countries, { provider: PROVIDER_NAME, totalResults: countries.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch countries from DramaID';
    return sendError(c, msg, 500);
  }
});

// GET /v1/dramaid/country/:slug?page=1
dramaidRoute.get('/country/:slug', edgeCache({ ttl: 900 }), async (c) => {
  const slug = c.req.param('slug')?.trim();
  if (!slug) {
    return sendError(c, 'Country slug is required', 400);
  }

  const parsed = CountryQuerySchema.safeParse(c.req.query());
  const page = parsed.success ? parsed.data.page : 1;

  try {
    const { items, hasNextPage } = await scraper.getByCountry(slug, page);
    return sendSuccess(c, items, {
      country: slug,
      page,
      hasNextPage,
      totalResults: items.length,
      provider: PROVIDER_NAME,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to fetch dramas in country ${slug}`;
    return sendError(c, msg, 500);
  }
});
