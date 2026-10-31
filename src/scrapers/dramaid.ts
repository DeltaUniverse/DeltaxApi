import {
  fetchHtml,
  loadCheerio,
  extractSlug,
  normalizeUrl,
} from '../utils/scraper-client.ts';
import type {
  DramaItem,
  DramaDetail,
  EpisodeDetail,
  StreamSource,
  VideoServer,
  DownloadFormat,
  GenreItem,
  CountryItem,
} from '../types.ts';

export const DRAMAID_BASE_URL = 'https://dramaid.nimegami.id';

export class DramaIdScraper {
  /**
   * Helper to parse .drama-card elements into structured DramaItem array
   */
  private parseDramaCards($: ReturnType<typeof loadCheerio>): DramaItem[] {
    const items: DramaItem[] = [];

    $('.drama-card').each((_, el) => {
      const a = $(el).find('.card-thumbnail');
      const href = a.attr('href') || $(el).find('.card-title').attr('href') || '';
      const title = $(el).find('.card-title').text().trim();
      const rawThumbnail =
        $(el).find('img').attr('src') ||
        $(el).find('img').attr('data-src') ||
        '';
      const thumbnail = normalizeUrl(rawThumbnail, DRAMAID_BASE_URL);
      const subType = $(el).find('.subtitle-badge').text().trim() || undefined;
      const badge = $(el).find('.episode-badge').text().trim() || undefined;
      const availability = $(el).find('.card-availability').text().trim() || undefined;

      // Extract metadata e.g. "China · 2026 · Historical"
      const metaText = $(el).find('.card-info p').first().text().trim();
      const parts = metaText.split('·').map((s) => s.trim());
      const country = parts[0] || undefined;
      const year = parts[1] || undefined;
      const genre = parts[2] || undefined;

      const slug = extractSlug(href);

      let status = 'Ongoing';
      if (badge?.toUpperCase().includes('TAMAT')) {
        status = 'Completed';
      } else if (badge?.toUpperCase().includes('SEGERA')) {
        status = 'Upcoming';
      }

      if (title && href) {
        items.push({
          title,
          slug,
          thumbnail,
          country,
          year,
          genre,
          latestEpisode: badge || availability,
          availability,
          subType,
          status,
          type: 'Series',
        });
      }
    });

    return items;
  }

  /**
   * Helper to determine whether next page exists in pagination
   */
  private hasNextPage($: ReturnType<typeof loadCheerio>, currentPage: number): boolean {
    return (
      $('.pagination a[aria-label*="berikutnya"]').length > 0 ||
      $(`.pagination a[href*="page=${currentPage + 1}"]`).length > 0 ||
      $(`.pagination a[href*="page%3D${currentPage + 1}"]`).length > 0
    );
  }

  /**
   * Fetches latest released dramas (paginated)
   */
  async getLatest(page = 1): Promise<{ items: DramaItem[]; hasNextPage: boolean }> {
    const url =
      page === 1
        ? `${DRAMAID_BASE_URL}/jelajahi?sort=latest`
        : `${DRAMAID_BASE_URL}/jelajahi?sort=latest&page=${page}`;

    const html = await fetchHtml(url, 15000, 180);
    const $ = loadCheerio(html);
    const items = this.parseDramaCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }

  /**
   * Fetches popular / trending dramas (paginated)
   */
  async getPopular(page = 1): Promise<{ items: DramaItem[]; hasNextPage: boolean }> {
    const url =
      page === 1
        ? `${DRAMAID_BASE_URL}/jelajahi?sort=popular`
        : `${DRAMAID_BASE_URL}/jelajahi?sort=popular&page=${page}`;

    const html = await fetchHtml(url, 15000, 900);
    const $ = loadCheerio(html);
    const items = this.parseDramaCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }

  /**
   * Searches dramas by keyword query (paginated)
   */
  async search(query: string, page = 1): Promise<{ items: DramaItem[]; hasNextPage: boolean }> {
    const cleanQuery = query.trim();
    const url =
      page === 1
        ? `${DRAMAID_BASE_URL}/jelajahi?q=${encodeURIComponent(cleanQuery)}`
        : `${DRAMAID_BASE_URL}/jelajahi?q=${encodeURIComponent(cleanQuery)}&page=${page}`;

    const html = await fetchHtml(url, 15000, 300);
    const $ = loadCheerio(html);
    const items = this.parseDramaCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }

  /**
   * Fetches full drama details, synopsis, cast, metadata, and episode list
   */
  async getDetail(slugOrUrl: string): Promise<DramaDetail> {
    let cleanSlug = slugOrUrl.trim();
    if (cleanSlug.startsWith('http')) {
      cleanSlug = extractSlug(cleanSlug);
    }
    // Clean any leading /drama/ if provided
    cleanSlug = cleanSlug.replace(/^\/?drama\//, '').replace(/\/+$/, '');

    const targetUrl = `${DRAMAID_BASE_URL}/drama/${cleanSlug}`;
    const html = await fetchHtml(targetUrl, 15000, 1800);
    const $ = loadCheerio(html);

    // Extract JSON-LD schema
    let jsonLd: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text());
        if (parsed['@type'] === 'TVSeries' || parsed['@type'] === 'Movie') {
          jsonLd = parsed;
        } else if (
          parsed.mainEntity?.['@type'] === 'TVSeries' ||
          parsed.mainEntity?.['@type'] === 'Movie'
        ) {
          jsonLd = parsed.mainEntity;
        }
      } catch {
        // ignore malformed scripts
      }
    });

    const title =
      jsonLd?.alternateName ||
      jsonLd?.name ||
      $('h1').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      cleanSlug;

    const alternateTitle = jsonLd?.name !== title ? jsonLd?.name : undefined;
    const synopsis =
      jsonLd?.description ||
      $('meta[name="description"]').attr('content') ||
      $('.synopsis, .drama-description, p.description').text().trim() ||
      '';

    const rawThumbnail =
      jsonLd?.image ||
      $('meta[property="og:image"]').attr('content') ||
      $('.hero-art img, .card-thumbnail img').attr('src') ||
      '';
    const thumbnail = normalizeUrl(rawThumbnail, DRAMAID_BASE_URL);

    const genres: string[] = Array.isArray(jsonLd?.genre)
      ? jsonLd.genre
      : [];

    // Cast members
    const cast: string[] = [];
    if (Array.isArray(jsonLd?.actor)) {
      for (const actor of jsonLd.actor) {
        if (actor.name && typeof actor.name === 'string') {
          cast.push(actor.name.trim());
        }
      }
    }

    const country =
      jsonLd?.countryOfOrigin?.name ||
      jsonLd?.countryOfOrigin ||
      undefined;

    const totalEpisodes =
      jsonLd?.numberOfEpisodes !== undefined
        ? jsonLd.numberOfEpisodes
        : undefined;

    // Parse episode tiles
    const episodes: Array<{
      title: string;
      episodeNumber: string;
      slug: string;
    }> = [];

    $('a.episode-tile, a[href*="/episode-"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      // Avoid duplicate 'Mulai nonton' button which links to the first episode
      const isStartWatch = $(el).text().toLowerCase().includes('mulai nonton');
      if (isStartWatch && episodes.length > 0) return;

      const epText = $(el).find('span').text().trim() || $(el).attr('aria-label') || $(el).text().trim();
      const numMatch = epText.match(/(\d+)/);
      const episodeNumber = numMatch ? numMatch[1] : epText.toLowerCase().includes('film') ? '1' : '';

      // Normalize slug to format: dramaSlug/episodeSlug
      const parts = href.split('/').filter(Boolean);
      const epSlug = parts.slice(-2).join('/');

      if (href && !episodes.some((e) => e.slug === epSlug)) {
        episodes.push({
          title: epText || `Episode ${episodeNumber || '1'}`,
          episodeNumber: episodeNumber || '1',
          slug: epSlug,
        });
      }
    });

    return {
      title,
      alternateTitle,
      slug: cleanSlug,
      thumbnail,
      synopsis,
      year: jsonLd?.year || undefined,
      country,
      format: jsonLd?.['@type'] === 'Movie' ? 'Movie' : 'Series',
      status: 'Available',
      totalEpisodes,
      genres,
      cast,
      episodes,
    };
  }

  /**
   * Fetches an episode's direct video streams, downloads, and navigation links
   */
  async getEpisode(
    dramaSlugOrUrl: string,
    episodeSlugParam?: string,
    _shouldExtract = true
  ): Promise<EpisodeDetail> {
    let dramaSlug = dramaSlugOrUrl.trim();
    let episodeSlug = episodeSlugParam?.trim();

    // Parse URL if provided
    if (dramaSlug.startsWith('http')) {
      const urlObj = new URL(dramaSlug);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      // Path format: /drama/:dramaSlug/:episodeSlug
      if (parts[0] === 'drama') {
        dramaSlug = parts[1] || '';
        episodeSlug = parts[2] || '';
      } else {
        dramaSlug = parts[0] || '';
        episodeSlug = parts[1] || '';
      }
    } else if (dramaSlug.includes('/')) {
      const parts = dramaSlug.split('/').filter(Boolean);
      dramaSlug = parts[0] || '';
      episodeSlug = parts[1] || '';
    }

    if (!dramaSlug) {
      throw new Error('Drama slug is required');
    }
    if (!episodeSlug) {
      throw new Error('Episode slug is required (e.g. episode-1)');
    }

    const targetUrl = `${DRAMAID_BASE_URL}/drama/${dramaSlug}/${episodeSlug}`;
    const html = await fetchHtml(targetUrl, 15000, 600);
    const $ = loadCheerio(html);

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('h1').text().trim() ||
      `${dramaSlug} ${episodeSlug}`;

    const dramaTitle =
      $('.breadcrumb a[href*="/drama/"]').text().trim() ||
      title.split('Episode')[0]?.replace(/^Nonton\s+/i, '')?.trim() ||
      dramaSlug;

    // Navigation
    let prev: { slug: string } | undefined;
    let next: { slug: string } | undefined;

    $('a').each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const href = $(el).attr('href') || '';
      if (text === 'sebelumnya' && href) {
        const parts = href.split('/').filter(Boolean);
        prev = {
          slug: parts.slice(-2).join('/'),
        };
      } else if (text === 'berikutnya' && href) {
        const parts = href.split('/').filter(Boolean);
        next = {
          slug: parts.slice(-2).join('/'),
        };
      }
    });

    const allEpisodes = {
      slug: dramaSlug,
    };

    // Extract streams and download links
    const streams: StreamSource[] = [];
    const downloads: DownloadFormat[] = [];
    const servers: VideoServer[] = [];

    // Parse download options from HTML
    $('.download-option').each((_, el) => {
      const href = $(el).attr('href') || '';
      const quality = $(el).find('strong').text().trim() || 'HD';
      const size = $(el).find('small').text().trim() || '';
      const fileId = href.split('/').filter(Boolean).pop();

      if (fileId) {
        const streamUrl = `${DRAMAID_BASE_URL}/api/v1/files/${fileId}/stream`;
        const directDownloadUrl = `${DRAMAID_BASE_URL}/api/v1/files/${fileId}/download`;
        const webDownloadUrl = normalizeUrl(href, DRAMAID_BASE_URL);

        streams.push({
          server: 'DramaID',
          quality,
          url: streamUrl,
          proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(DRAMAID_BASE_URL + '/')}`,
          type: 'video/mp4',
          headers: {
            Referer: `${DRAMAID_BASE_URL}/`,
          },
        });

        servers.push({
          server: `DramaID - ${quality}`,
          url: streamUrl,
        });

        downloads.push({
          resolution: size ? `${quality} (${size})` : quality,
          links: [
            {
              server: 'BerkasDrive Direct',
              url: directDownloadUrl,
            },
            {
              server: 'DramaID Web',
              url: webDownloadUrl,
            },
          ],
        });
      }
    });

    // Fallback: check <video src="..."> if download-option was not present
    if (streams.length === 0) {
      const videoSrc = $('video').attr('src');
      if (videoSrc) {
        const streamUrl = normalizeUrl(videoSrc, DRAMAID_BASE_URL);
        streams.push({
          server: 'DramaID',
          quality: 'Auto',
          url: streamUrl,
          proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(DRAMAID_BASE_URL + '/')}`,
          type: 'video/mp4',
          headers: {
            Referer: `${DRAMAID_BASE_URL}/`,
          },
        });
        servers.push({
          server: 'DramaID',
          url: streamUrl,
        });
      }
    }

    const currentEpisodeMatch = episodeSlug.match(/(\d+)/);
    const currentEpisode = currentEpisodeMatch ? currentEpisodeMatch[1] : episodeSlug;

    return {
      title,
      slug: `${dramaSlug}/${episodeSlug}`,
      dramaTitle,
      dramaSlug,
      currentEpisode,
      defaultPlayer: streams[0]?.url,
      streams,
      servers,
      downloads,
      navigation: {
        prev,
        next,
        allEpisodes,
      },
    };
  }

  /**
   * Fetches all available genre categories
   */
  async getGenres(): Promise<GenreItem[]> {
    const url = `${DRAMAID_BASE_URL}/genre`;
    const html = await fetchHtml(url, 15000, 86400);
    const $ = loadCheerio(html);
    const genresMap = new Map<string, string>();

    $('a[href^="/genre/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const slug = href.replace(/^\/genre\//, '').replace(/\/+$/, '');
      const rawText = $(el).find('h2, h3, span, p').first().text().trim() || $(el).text().trim();
      const cleanName = rawText.replace(/^[♡☺✧\s]+/, '').trim() || slug;

      if (slug && !genresMap.has(slug)) {
        genresMap.set(slug, cleanName);
      }
    });

    return Array.from(genresMap.entries()).map(([slug, name]) => ({
      name,
      slug,
    }));
  }

  /**
   * Fetches dramas filtered by genre
   */
  async getByGenre(
    genreSlug: string,
    page = 1
  ): Promise<{ items: DramaItem[]; hasNextPage: boolean }> {
    const clean = genreSlug.trim().toLowerCase();
    const url =
      page === 1
        ? `${DRAMAID_BASE_URL}/genre/${clean}`
        : `${DRAMAID_BASE_URL}/genre/${clean}?page=${page}`;

    const html = await fetchHtml(url, 15000, 900);
    const $ = loadCheerio(html);
    const items = this.parseDramaCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }

  /**
   * Fetches all available countries
   */
  async getCountries(): Promise<CountryItem[]> {
    const url = `${DRAMAID_BASE_URL}/country`;
    const html = await fetchHtml(url, 15000, 86400);
    const $ = loadCheerio(html);
    const countriesMap = new Map<string, string>();

    $('a[href^="/country/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const slug = href.replace(/^\/country\//, '').replace(/\/+$/, '');
      const rawText = $(el).text().trim().replace(/\s+/g, ' ');
      // e.g. "KRDrama Korea" -> "Drama Korea", or clean title
      const cleanName = rawText.replace(/^[A-Z]{2}(Drama\s+)?/, '').trim() || rawText;

      if (slug && !countriesMap.has(slug)) {
        countriesMap.set(slug, cleanName);
      }
    });

    return Array.from(countriesMap.entries()).map(([slug, name]) => ({
      name,
      slug,
    }));
  }

  /**
   * Fetches dramas filtered by country
   */
  async getByCountry(
    countrySlug: string,
    page = 1
  ): Promise<{ items: DramaItem[]; hasNextPage: boolean }> {
    const clean = countrySlug.trim().toLowerCase();
    const url =
      page === 1
        ? `${DRAMAID_BASE_URL}/country/${clean}`
        : `${DRAMAID_BASE_URL}/country/${clean}?page=${page}`;

    const html = await fetchHtml(url, 15000, 900);
    const $ = loadCheerio(html);
    const items = this.parseDramaCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }
}
