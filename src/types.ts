import { z } from 'zod';

export const WATERMARK = {
  powered_by: 'deltax',
  support_chat: 'https://t.me/DeltaDiscuss',
} as const;

// Validation Schemas
export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query is required'),
  page: z.coerce.number().int().positive().default(1),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});

export const SlugParamSchema = z.object({
  slug: z.string().trim().min(1, 'Slug is required'),
});

export const GenreQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});

export const CountryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});

export const EpisodeQuerySchema = z.object({
  url: z.string().url().optional(),
});

// Common Types
export interface AnimeItem {
  title: string;
  slug: string;
  thumbnail: string;
  type?: string;
  status?: string;
  latestEpisode?: string;
  subType?: string;
  rating?: string;
  episodeTitle?: string;
}

export interface AnimeDetail {
  title: string;
  slug: string;
  thumbnail: string;
  rating?: string;
  synopsis: string;
  genres: string[];
  metadata: Record<string, string>;
  episodes: Array<{
    title: string;
    episodeNumber: string;
    releaseDate: string;
    slug: string;
  }>;
}

export interface VideoServer {
  server: string;
  url: string;
}

export interface StreamSource {
  server: string;
  quality?: string;
  url: string;
  proxyUrl?: string;
  type: string;
  headers?: Record<string, string>;
}

export interface DownloadLink {
  server: string;
  url: string;
}

export interface DownloadFormat {
  resolution: string;
  links: DownloadLink[];
}

export interface EpisodeDetail {
  title: string;
  slug: string;
  animeTitle?: string;
  animeSlug?: string;
  dramaTitle?: string;
  dramaSlug?: string;
  currentEpisode?: string;
  synopsis?: string;
  defaultPlayer?: string;
  streams: StreamSource[];
  servers: VideoServer[];
  downloads: DownloadFormat[];
  navigation?: {
    prev?: { slug: string };
    next?: { slug: string };
    allEpisodes?: { slug: string };
  };
}

export interface DramaItem {
  title: string;
  slug: string;
  thumbnail: string;
  country?: string;
  year?: string | number;
  genre?: string;
  latestEpisode?: string;
  availability?: string;
  subType?: string;
  status?: string;
  type?: string;
}

export interface DramaDetail {
  title: string;
  alternateTitle?: string;
  slug: string;
  thumbnail: string;
  synopsis: string;
  year?: string | number;
  country?: string;
  format?: string;
  status?: string;
  rating?: string;
  totalEpisodes?: number | string;
  genres: string[];
  cast: string[];
  metadata?: Record<string, string>;
  episodes: Array<{
    title: string;
    episodeNumber: string;
    slug: string;
  }>;
}

export interface ScheduleDay {
  day: string;
  animeList: Array<{
    title: string;
    slug: string;
  }>;
}

export interface GenreItem {
  name: string;
  slug: string;
}

export interface CountryItem {
  name: string;
  slug: string;
}
