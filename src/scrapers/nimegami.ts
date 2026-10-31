import {
  fetchHtml,
  loadCheerio,
  extractSlug,
  normalizeUrl,
} from '../utils/scraper-client.ts';
import type {
  AnimeItem,
  AnimeDetail,
  EpisodeDetail,
  StreamSource,
  VideoServer,
  DownloadFormat,
  GenreItem,
} from '../types.ts';

export const NIMEGAMI_BASE_URL = 'https://nimegami.id';

export class NimegamiScraper {
  /**
   * Helper to clean Next.js image proxy URLs into direct image URLs
   */
  private cleanImageUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    const match = rawUrl.match(/url=([^&]+)/);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        return normalizeUrl(decoded, NIMEGAMI_BASE_URL);
      } catch {
        // fallback
      }
    }
    return normalizeUrl(rawUrl, NIMEGAMI_BASE_URL);
  }

  /**
   * Helper to parse article.anime-card elements into AnimeItem[]
   */
  private parseAnimeCards($: ReturnType<typeof loadCheerio>): AnimeItem[] {
    const items: AnimeItem[] = [];

    $('article.anime-card').each((_, el) => {
      const a = $(el).find('.poster-link');
      const href = a.attr('href') || $(el).find('.card-title').attr('href') || '';
      const title =
        $(el).find('.card-title').text().trim() ||
        a.attr('aria-label')?.replace(/^Lihat\s+/i, '').trim() ||
        '';

      const rawThumbnail =
        $(el).find('img').attr('src') ||
        $(el).find('img').attr('data-src') ||
        '';
      const thumbnail = this.cleanImageUrl(rawThumbnail);

      const rating = $(el).find('.score-badge').text().trim() || undefined;
      const format = $(el).find('.format-badge').text().trim() || undefined;
      const isOngoing = $(el).find('.ongoing-badge').length > 0;
      const status = isOngoing ? 'Ongoing' : 'Completed';

      const lastEp =
        $(el).find('.card-last-episode strong').text().trim() ||
        $(el).find('.card-last-episode').text().trim() ||
        $(el).find('.poster-bottom span').text().trim() ||
        undefined;

      const slug = extractSlug(href);

      if (title && href && slug) {
        items.push({
          title,
          slug,
          thumbnail,
          rating,
          type: format,
          status,
          latestEpisode: lastEp ? `Episode ${lastEp.replace(/^[^\d]+/, '')}` : undefined,
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
   * Fetches latest updated anime (paginated)
   */
  async getLatest(page = 1): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
    const url =
      page === 1
        ? `${NIMEGAMI_BASE_URL}/anime/?sort=updated`
        : `${NIMEGAMI_BASE_URL}/anime/?sort=updated&page=${page}`;

    const html = await fetchHtml(url, 15000, 180);
    const $ = loadCheerio(html);
    const items = this.parseAnimeCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }

  /**
   * Fetches popular anime (paginated)
   */
  async getPopular(page = 1): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
    const url =
      page === 1
        ? `${NIMEGAMI_BASE_URL}/anime/?sort=popular`
        : `${NIMEGAMI_BASE_URL}/anime/?sort=popular&page=${page}`;

    const html = await fetchHtml(url, 15000, 900);
    const $ = loadCheerio(html);
    const items = this.parseAnimeCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }

  /**
   * Searches anime by keyword query (paginated)
   */
  async search(query: string, page = 1): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
    const cleanQuery = query.trim();
    const url =
      page === 1
        ? `${NIMEGAMI_BASE_URL}/anime/?q=${encodeURIComponent(cleanQuery)}`
        : `${NIMEGAMI_BASE_URL}/anime/?q=${encodeURIComponent(cleanQuery)}&page=${page}`;

    const html = await fetchHtml(url, 15000, 300);
    const $ = loadCheerio(html);
    const items = this.parseAnimeCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }

  /**
   * Fetches full anime details, synopsis, info table, and episode list
   */
  async getDetail(slugOrUrl: string): Promise<AnimeDetail> {
    let cleanSlug = slugOrUrl.trim();
    if (cleanSlug.startsWith('http')) {
      cleanSlug = extractSlug(cleanSlug);
    }
    cleanSlug = cleanSlug.replace(/\/+$/, '');

    const targetUrl = `${NIMEGAMI_BASE_URL}/${cleanSlug}/`;
    const html = await fetchHtml(targetUrl, 15000, 1800);
    const $ = loadCheerio(html);

    // Extract JSON-LD schema
    let jsonLd: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text());
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          const series = parsed['@graph'].find(
            (item: any) => item['@type'] === 'TVSeries' || item['@type'] === 'Movie'
          );
          if (series) jsonLd = series;
        } else if (parsed['@type'] === 'TVSeries' || parsed['@type'] === 'Movie') {
          jsonLd = parsed;
        }
      } catch {
        // ignore malformed scripts
      }
    });

    const title =
      jsonLd?.name ||
      $('h1').text().trim() ||
      $('meta[property="og:title"]').attr('content')?.split('|')[0]?.trim() ||
      cleanSlug;

    const synopsis =
      jsonLd?.description ||
      $('meta[name="description"]').attr('content') ||
      $('.synopsis, .anime-description, p.description').text().trim() ||
      '';

    const rawThumbnail =
      jsonLd?.image ||
      $('meta[property="og:image"]').attr('content') ||
      $('.poster-image, .anime-info img').first().attr('src') ||
      '';
    const thumbnail = this.cleanImageUrl(rawThumbnail);

    const genres: string[] = Array.isArray(jsonLd?.genre) ? jsonLd.genre : [];

    // Parse metadata from aside.anime-info
    const metadata: Record<string, string> = {};
    $('aside.anime-info dl div').each((_, el) => {
      const k = $(el).find('dt').text().trim();
      const v = $(el).find('dd').text().trim();
      if (k && v) {
        metadata[k] = v;
      }
    });

    const rating =
      metadata['Rating']?.split('/')[0]?.trim() ||
      $('.score-badge').first().text().trim() ||
      undefined;

    // Parse episodes from download subsections or stream grid
    const episodes: Array<{
      title: string;
      episodeNumber: string;
      slug: string;
    }> = [];

    $('.download-subsection').each((_, sec) => {
      const subTitle = $(sec).find('h3').text().trim();
      if (!subTitle || subTitle.toLowerCase().includes('batch') || subTitle.toLowerCase().includes('tambahan')) {
        return;
      }

      const numMatch = subTitle.match(/(\d+)/);
      const epNum = numMatch ? numMatch[1] : '1';
      const epSlug = `${cleanSlug}/episode-${epNum}`;

      if (!episodes.some((e) => e.slug === epSlug)) {
        episodes.push({
          title: subTitle,
          episodeNumber: epNum,
          slug: epSlug,
        });
      }
    });

    // Fallback: if no download subsections, check #stream-episode-list
    if (episodes.length === 0) {
      $('#stream-episode-list a[href*="#episode_"]').each((_, a) => {
        const epText = $(a).attr('title') || $(a).attr('aria-label') || $(a).text().trim();
        const numMatch = epText.match(/(\d+)/);
        const epNum = numMatch ? numMatch[1] : '1';
        const epSlug = `${cleanSlug}/episode-${epNum}`;

        if (!episodes.some((e) => e.slug === epSlug)) {
          episodes.push({
            title: `Episode ${epNum}`,
            episodeNumber: epNum,
            slug: epSlug,
          });
        }
      });
    }

    // Single movie/episode fallback
    if (episodes.length === 0) {
      episodes.push({
        title: 'Full Movie / Episode 1',
        episodeNumber: '1',
        slug: `${cleanSlug}/episode-1`,
      });
    }

    return {
      title,
      slug: cleanSlug,
      thumbnail,
      rating,
      synopsis,
      genres,
      metadata,
      episodes,
    };
  }

  /**
   * Fetches episode streams, direct player, downloads, and navigation
   */
  async getEpisode(
    animeSlugOrUrl: string,
    episodeSlugParam?: string,
    _shouldExtract = true
  ): Promise<EpisodeDetail> {
    let animeSlug = animeSlugOrUrl.trim();
    let episodeParam = episodeSlugParam?.trim();

    // Parse URLs or composite slugs e.g. "snk-s1-sub-indo/episode-1"
    if (animeSlug.startsWith('http')) {
      const urlObj = new URL(animeSlug);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      animeSlug = parts[0] || '';
      episodeParam = parts[1] || '';
    } else if (animeSlug.includes('/')) {
      const parts = animeSlug.split('/').filter(Boolean);
      animeSlug = parts[0] || '';
      episodeParam = parts[1] || '';
    }

    if (!animeSlug) {
      throw new Error('Anime slug is required');
    }

    const epMatch = episodeParam?.match(/(\d+)/);
    const epNum = epMatch ? epMatch[1] : '1';

    const targetUrl = `${NIMEGAMI_BASE_URL}/${animeSlug}/`;
    const html = await fetchHtml(targetUrl, 15000, 600);
    const $ = loadCheerio(html);

    const animeTitle =
      $('h1').text().trim() ||
      $('meta[property="og:title"]').attr('content')?.split('|')[0]?.trim() ||
      animeSlug;

    const title = `${animeTitle} Episode ${epNum}`;

    // Find download section for this episode
    let targetSection = $(`#download_episode_${epNum}`);
    if (targetSection.length === 0) {
      targetSection = $('.download-subsection').filter((_, el) => {
        const text = $(el).find('h3').text().trim();
        return text.toLowerCase().includes(`episode ${epNum}`) || (epNum === '1' && text.toLowerCase().includes('movie'));
      });
    }
    if (targetSection.length === 0 && $('.download-subsection').length > 0) {
      // fallback to the first non-batch section
      targetSection = $('.download-subsection').filter((_, el) => {
        const text = $(el).find('h3').text().toLowerCase();
        return !text.includes('batch');
      }).first();
    }

    const downloads: DownloadFormat[] = [];
    const streams: StreamSource[] = [];
    const servers: VideoServer[] = [];
    let streamPlayerUrl: string | undefined;

    targetSection.find('.download-row').each((_, row) => {
      const quality = $(row).find('.quality-label strong').text().trim() || 'HD';
      const links: Array<{ server: string; url: string }> = [];

      $(row).find('.download-mirrors a').each((_, a) => {
        const serverName = $(a).text().trim() || 'Direct';
        const href = $(a).attr('href') || '';
        if (href) {
          const directUrl = normalizeUrl(href, NIMEGAMI_BASE_URL);
          links.push({
            server: serverName,
            url: directUrl,
          });

          // Check for BerkasDrive or stream-convertible mirror
          if (
            !streamPlayerUrl &&
            href.includes('/download/') &&
            (serverName.toLowerCase().includes('berkasdrive') || href.includes(`/${quality}/`))
          ) {
            streamPlayerUrl = href.replace('/download/', '/streaming/');
          }
        }
      });

      if (links.length > 0) {
        downloads.push({
          resolution: quality,
          links,
        });
      }
    });

    // Try resolving direct video stream from stream player page
    if (streamPlayerUrl) {
      const normalizedPlayer = normalizeUrl(streamPlayerUrl, NIMEGAMI_BASE_URL);
      try {
        const playerHtml = await fetchHtml(normalizedPlayer, 10000, 3600);
        const p$ = loadCheerio(playerHtml);
        const directSrc = p$('#player').attr('data-src') || p$('#embedPlayer').attr('data-src');

        if (directSrc) {
          const cleanDirect = normalizeUrl(directSrc, NIMEGAMI_BASE_URL);
          streams.push({
            server: 'BerkasDrive',
            quality: '720p',
            url: cleanDirect,
            proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(cleanDirect)}&referer=${encodeURIComponent(NIMEGAMI_BASE_URL + '/')}`,
            type: 'video/mp4',
            headers: {
              Referer: `${NIMEGAMI_BASE_URL}/`,
            },
          });

          servers.push({
            server: 'BerkasDrive',
            url: cleanDirect,
          });
        }
      } catch (err) {
        console.warn('Failed to resolve direct Nimegami stream player, falling back to player URL', err);
      }

      servers.push({
        server: 'Nimegami Web Player',
        url: normalizedPlayer,
      });
    }

    // Determine total episodes for navigation
    const totalEpisodesCount = $('.download-subsection').filter((_, el) => {
      const t = $(el).find('h3').text().toLowerCase();
      return !t.includes('batch') && !t.includes('tambahan');
    }).length || 1;

    const currentNum = parseInt(epNum, 10) || 1;
    const prev = currentNum > 1 ? { slug: `${animeSlug}/episode-${currentNum - 1}` } : undefined;
    const next = currentNum < totalEpisodesCount ? { slug: `${animeSlug}/episode-${currentNum + 1}` } : undefined;
    const allEpisodes = { slug: animeSlug };

    return {
      title,
      slug: `${animeSlug}/episode-${epNum}`,
      animeTitle,
      animeSlug,
      currentEpisode: epNum,
      defaultPlayer: streams[0]?.url || (streamPlayerUrl ? normalizeUrl(streamPlayerUrl, NIMEGAMI_BASE_URL) : undefined),
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
   * Fetches all anime genres
   */
  async getGenres(): Promise<GenreItem[]> {
    const url = `${NIMEGAMI_BASE_URL}/genre/`;
    const html = await fetchHtml(url, 15000, 86400);
    const $ = loadCheerio(html);
    const genresMap = new Map<string, string>();

    $('a[href*="/category/"]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const slug = href.replace(/^\/category\//, '').replace(/\/+$/, '');
      const rawName = $(a).find('h2, h3').text().trim() || $(a).text().trim();
      const cleanName = rawName.replace(/^\d+/, '').replace(/post anime.*$/i, '').trim() || slug;

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
   * Fetches anime list filtered by genre (paginated)
   */
  async getByGenre(genreSlug: string, page = 1): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
    const cleanSlug = genreSlug.trim().toLowerCase();
    const url =
      page === 1
        ? `${NIMEGAMI_BASE_URL}/category/${cleanSlug}/`
        : `${NIMEGAMI_BASE_URL}/category/${cleanSlug}/?page=${page}`;

    const html = await fetchHtml(url, 15000, 900);
    const $ = loadCheerio(html);
    const items = this.parseAnimeCards($);
    const hasNext = this.hasNextPage($, page);

    return { items, hasNextPage: hasNext };
  }

  /**
   * Fetches batch download formats for an anime
   */
  async getBatch(slugOrUrl: string): Promise<{
    title: string;
    slug: string;
    downloads: DownloadFormat[];
  }> {
    let cleanSlug = slugOrUrl.trim();
    if (cleanSlug.startsWith('http')) {
      cleanSlug = extractSlug(cleanSlug);
    }
    cleanSlug = cleanSlug.replace(/\/+$/, '');

    const targetUrl = `${NIMEGAMI_BASE_URL}/${cleanSlug}/`;
    const html = await fetchHtml(targetUrl, 15000, 1800);
    const $ = loadCheerio(html);

    const title = $('h1').text().trim() || cleanSlug;
    const batchSection = $('.download-subsection').filter((_, el) => {
      const t = $(el).find('h3').text().toLowerCase();
      return t.includes('batch');
    });

    const downloads: DownloadFormat[] = [];
    batchSection.find('.download-row').each((_, row) => {
      const quality = $(row).find('.quality-label strong').text().trim() || 'Batch';
      const links: Array<{ server: string; url: string }> = [];

      $(row).find('.download-mirrors a').each((_, a) => {
        const server = $(a).text().trim() || 'Direct';
        const href = $(a).attr('href') || '';
        if (href) {
          links.push({
            server,
            url: normalizeUrl(href, NIMEGAMI_BASE_URL),
          });
        }
      });

      if (links.length > 0) {
        downloads.push({
          resolution: quality,
          links,
        });
      }
    });

    return {
      title: `${title} - Batch Download`,
      slug: cleanSlug,
      downloads,
    };
  }
}
