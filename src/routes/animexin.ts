import { Hono } from 'hono';
import { AnimexinScraper } from '../scrapers/animexin.ts';
import { sendSuccess, sendError } from '../utils/response.ts';
import {
  SearchQuerySchema,
  PaginationQuerySchema,
  GenreQuerySchema,
} from '../types.ts';

export const animexinRoute = new Hono();
const scraper = new AnimexinScraper();

// GET /v1/animexin/popular?page=1 or /v1/animexin/trending?page=1
const handlePopular = async (c: any) => {
  const parsed = PaginationQuerySchema.safeParse(c.req.query());
  const page = parsed.success ? parsed.data.page : 1;

  try {
    const { items, hasNextPage } = await scraper.getPopular(page);
    return sendSuccess(
      c,
      items,
      {
        page,
        hasNextPage,
        totalResults: items.length,
        provider: 'animexin.dev',
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch popular anime from AnimeXin';
    return sendError(c, msg, 500);
  }
};

animexinRoute.get('/popular', handlePopular);
animexinRoute.get('/trending', handlePopular);

// GET /v1/animexin/latest?page=1
animexinRoute.get('/latest', async (c) => {
  const parsed = PaginationQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return sendError(c, 'Invalid pagination parameters', 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const { items, hasNextPage } = await scraper.getLatest(parsed.data.page);
    return sendSuccess(
      c,
      items,
      {
        page: parsed.data.page,
        hasNextPage,
        totalResults: items.length,
        provider: 'animexin.dev',
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch latest releases from AnimeXin';
    return sendError(c, msg, 500);
  }
});

// GET /v1/animexin/search?q=battle&page=1
animexinRoute.get('/search', async (c) => {
  const parsed = SearchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return sendError(c, 'Invalid search query parameters', 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const { items, hasNextPage } = await scraper.search(parsed.data.q, parsed.data.page);
    return sendSuccess(
      c,
      items,
      {
        query: parsed.data.q,
        page: parsed.data.page,
        hasNextPage,
        totalResults: items.length,
        provider: 'animexin.dev',
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to search AnimeXin';
    return sendError(c, msg, 500);
  }
});

// GET /v1/animexin/detail/:slug
animexinRoute.get('/detail/:slug', async (c) => {
  const slug = c.req.param('slug')?.trim();
  if (!slug) {
    return sendError(c, 'Anime slug is required', 400);
  }

  try {
    const detail = await scraper.getDetail(slug);
    return sendSuccess(c, detail, { provider: 'animexin.dev' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to get anime details for ${slug}`;
    return sendError(c, msg, 404);
  }
});

// GET /v1/animexin/episode/:slug (supports slug or query ?url=..., ?extract=true|false)
animexinRoute.get('/episode/:slug', async (c) => {
  const slug = c.req.param('slug')?.trim();
  const queryUrl = c.req.query('url')?.trim();
  const target = queryUrl || slug;
  const shouldExtract = c.req.query('extract') !== 'false';

  if (!target) {
    return sendError(c, 'Episode slug or URL is required', 400);
  }

  try {
    const episode = await scraper.getEpisode(target, shouldExtract);
    return sendSuccess(c, episode, { provider: 'animexin.dev' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to get episode stream for ${target}`;
    return sendError(c, msg, 404);
  }
});

// GET /v1/animexin/schedule
animexinRoute.get('/schedule', async (c) => {
  try {
    const schedule = await scraper.getSchedule();
    return sendSuccess(c, schedule, { provider: 'animexin.dev' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch release schedule from AnimeXin';
    return sendError(c, msg, 500);
  }
});

// GET /v1/animexin/genres
animexinRoute.get('/genres', async (c) => {
  try {
    const genres = await scraper.getGenres();
    return sendSuccess(c, genres, { provider: 'animexin.dev', totalResults: genres.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch genres from AnimeXin';
    return sendError(c, msg, 500);
  }
});

// GET /v1/animexin/genre/:slug?page=1
animexinRoute.get('/genre/:slug', async (c) => {
  const slug = c.req.param('slug')?.trim();
  if (!slug) {
    return sendError(c, 'Genre slug is required', 400);
  }

  const parsed = GenreQuerySchema.safeParse(c.req.query());
  const page = parsed.success ? parsed.data.page : 1;

  try {
    const { items, hasNextPage } = await scraper.getByGenre(slug, page);
    return sendSuccess(
      c,
      items,
      {
        genre: slug,
        page,
        hasNextPage,
        totalResults: items.length,
        provider: 'animexin.dev',
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to fetch anime in genre ${slug}`;
    return sendError(c, msg, 500);
  }
});
