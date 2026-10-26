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

export const EpisodeQuerySchema = z.object({
  url: z.string().url().optional(),
});

// Common Types
export interface AnimeItem {
  title: string;
  slug: string;
  url: string;
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
  url: string;
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
    url: string;
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
  url: string;
  animeTitle?: string;
  animeSlug?: string;
  animeUrl?: string;
  currentEpisode?: string;
  defaultPlayer?: string;
  streams: StreamSource[];
  servers: VideoServer[];
  downloads: DownloadFormat[];
  navigation?: {
    prev?: { slug: string; url: string };
    next?: { slug: string; url: string };
    allEpisodes?: { slug: string; url: string };
  };
}

export interface ScheduleDay {
  day: string;
  animeList: Array<{
    title: string;
    slug: string;
    url: string;
  }>;
}

export interface GenreItem {
  name: string;
  slug: string;
  url: string;
}
