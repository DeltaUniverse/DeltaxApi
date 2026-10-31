import {
  fetchHtml,
  loadCheerio,
  extractSlug,
  normalizeUrl,
  extractCleanEmbedUrl,
  isIrrelevantItem,
} from '../utils/scraper-client.ts';
import { extractAllServers } from '../extractors/index.ts';
import type {
  AnimeItem,
  AnimeDetail,
  EpisodeDetail,
  VideoServer,
  StreamSource,
  DownloadFormat,
  ScheduleDay,
  GenreItem,
} from '../types.ts';

export const ANIMEXIN_BASE_URL = 'https://animexin.dev';

export class AnimexinScraper {
  /**
   * Fetches latest released episodes / anime from Latest Release
   */
  async getLatest(page = 1): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
    const url =
      page === 1
        ? `${ANIMEXIN_BASE_URL}/`
        : `${ANIMEXIN_BASE_URL}/page/${page}/`;

    const html = await fetchHtml(url, 15000, 180);
    const $ = loadCheerio(html);
    const items: AnimeItem[] = [];

    // Specifically target the "Latest Release" section
    const latestSection = $('.listupd').filter((_, el) => {
      const headerText = $(el).prev().text() + ' ' + $(el).parent().find('h2, h3').first().text();
      return /latest release/i.test(headerText);
    });
    const container = latestSection.length > 0 ? latestSection : $('.listupd').eq(1);
    const searchScope = container.length > 0 && container.find('article.bs').length > 0
      ? container.find('article.bs')
      : $('.listupd article.bs, .post-show article.bs');

    searchScope.each((_, el) => {
      const a = $(el).find('.bsx a');
      const href = a.attr('href') || '';
      const animeTitle = a.find('.tt').contents().first().text().trim();
      const rawTitle = a.attr('title') || $(el).find('.tt').text().trim();
      const title = animeTitle || rawTitle;
      const episodeTitle = a.find('.tt h2').text().trim() || a.attr('title') || rawTitle;
      const slug = extractSlug(href);

      // Filter out non-anime articles, tutorials, shortlinks, announcements
      if (isIrrelevantItem(title, href, slug)) {
        return;
      }

      const thumbnail =
        $(el).find('img').attr('src') ||
        $(el).find('img').attr('data-src') ||
        '';

      if (title && href) {
        items.push({
          title,
          slug,
          thumbnail: normalizeUrl(thumbnail, ANIMEXIN_BASE_URL),
          type: $(el).find('.typez').text().trim() || undefined,
          status: $(el).find('.status').text().trim() || undefined,
          latestEpisode: $(el).find('.epx').text().trim() || undefined,
          subType: $(el).find('.sb').text().trim() || undefined,
          episodeTitle,
        });
      }
    });

    const hasNextPage =
      $('.pagination .next').length > 0 ||
      $('.hpage a.r').length > 0 ||
      $(`.pagination a[href*="/page/${page + 1}/"]`).length > 0;

    return { items, hasNextPage };
  }

  /**
   * Fetches popular/trending anime series
   */
  async getPopular(page = 1): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
    try {
      const url = `${ANIMEXIN_BASE_URL}/anime/?order=popular&page=${page}`;
      const html = await fetchHtml(url, 15000, 900);
      const $ = loadCheerio(html);
      const items: AnimeItem[] = [];

      $('article.bs').each((_, el) => {
        const a = $(el).find('.bsx a');
        const href = a.attr('href') || '';
        const title = a.find('.tt').contents().first().text().trim() || a.find('.tt').text().trim() || a.attr('title') || '';
        const slug = extractSlug(href);

        if (isIrrelevantItem(title, href, slug)) {
          return;
        }

        const thumbnail =
          $(el).find('img').attr('src') ||
          $(el).find('img').attr('data-src') ||
          '';

        if (title && href) {
          items.push({
            title,
            slug,
            thumbnail: normalizeUrl(thumbnail, ANIMEXIN_BASE_URL),
            type: $(el).find('.typez').text().trim() || 'Donghua',
            status: $(el).find('.status').text().trim() || 'Ongoing',
            latestEpisode: $(el).find('.epx').text().trim() || undefined,
            subType: $(el).find('.sb').text().trim() || undefined,
            rating: $(el).find('.rating').text().trim() || undefined,
          });
        }
      });

      if (items.length > 0) {
        const hasNextPage =
          $('.pagination .next').length > 0 ||
          $(`.pagination a[href*="page=${page + 1}"]`).length > 0;
        return { items, hasNextPage };
      }
    } catch (e) {
      console.warn('Failed to fetch animexin popular, falling back to homepage popular', e);
    }

    // Fallback: extract from homepage popular section (.popconslide or .listupd eq 0)
    const html = await fetchHtml(ANIMEXIN_BASE_URL, 15000, 900);
    const $ = loadCheerio(html);
    const items: AnimeItem[] = [];

    $('.popconslide article.bs, .listupd').eq(0).find('article.bs').each((_, el) => {
      const a = $(el).find('.bsx a');
      const href = a.attr('href') || '';
      const title = a.find('.tt').contents().first().text().trim() || a.find('.tt').text().trim() || a.attr('title') || '';
      const slug = extractSlug(href);

      if (isIrrelevantItem(title, href, slug)) return;

      const thumbnail =
        $(el).find('img').attr('src') ||
        $(el).find('img').attr('data-src') ||
        '';

      if (title && href) {
        items.push({
          title,
          slug,
          thumbnail: normalizeUrl(thumbnail, ANIMEXIN_BASE_URL),
          type: $(el).find('.typez').text().trim() || 'Donghua',
          status: $(el).find('.status').text().trim() || 'Ongoing',
          latestEpisode: $(el).find('.epx').text().trim() || undefined,
          subType: $(el).find('.sb').text().trim() || undefined,
        });
      }
    });

    return { items, hasNextPage: false };
  }

  /**
   * Searches for anime by keyword
   */
  async search(query: string, page = 1): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
    const encoded = encodeURIComponent(query);
    const url =
      page === 1
        ? `${ANIMEXIN_BASE_URL}/?s=${encoded}`
        : `${ANIMEXIN_BASE_URL}/page/${page}/?s=${encoded}`;

    const html = await fetchHtml(url, 15000, 300);
    const $ = loadCheerio(html);
    const items: AnimeItem[] = [];

    $('article.bs').each((_, el) => {
      const a = $(el).find('.bsx a');
      const href = a.attr('href') || '';
      const title = a.attr('title') || $(el).find('.tt').text().trim();
      const slug = extractSlug(href);

      // Filter out non-anime articles, tutorials, shortlinks, announcements
      if (isIrrelevantItem(title, href, slug)) {
        return;
      }

      const thumbnail =
        $(el).find('img').attr('src') ||
        $(el).find('img').attr('data-src') ||
        '';

      if (title && href) {
        items.push({
          title,
          slug,
          thumbnail: normalizeUrl(thumbnail, ANIMEXIN_BASE_URL),
          type: $(el).find('.typez').text().trim() || undefined,
          status: $(el).find('.status').text().trim() || undefined,
          latestEpisode: $(el).find('.epx').text().trim() || undefined,
          subType: $(el).find('.sb').text().trim() || undefined,
        });
      }
    });

    const hasNextPage =
      $('.pagination .next').length > 0 ||
      $(`.pagination a[href*="/page/${page + 1}/"]`).length > 0;

    return { items, hasNextPage };
  }

  /**
   * Gets details of an anime series including episode list
   */
  async getDetail(slugOrUrl: string): Promise<AnimeDetail> {
    if (isIrrelevantItem('', slugOrUrl, slugOrUrl)) {
      throw new Error(`Invalid anime slug: "${slugOrUrl}" is not an anime series`);
    }

    let targetUrl: string;
    const cleanSlug = extractSlug(slugOrUrl);

    if (slugOrUrl.startsWith('http://') || slugOrUrl.startsWith('https://')) {
      targetUrl = slugOrUrl;
    } else {
      // Primary canonical URL on animexin.dev is /:slug/
      targetUrl = `${ANIMEXIN_BASE_URL}/${cleanSlug}/`;
    }

    let html = '';
    try {
      html = await fetchHtml(targetUrl, 15000, 1800);
    } catch {
      if (isIrrelevantItem('', '', cleanSlug)) {
        throw new Error(`Invalid anime slug: "${slugOrUrl}" is not an anime series`);
      }
      // Fallback to /anime/:slug/ if root path fails
      targetUrl = `${ANIMEXIN_BASE_URL}/anime/${cleanSlug}/`;
      html = await fetchHtml(targetUrl, 15000, 1800);
    }

    const $ = loadCheerio(html);

    const title =
      $('.entry-title').first().text().trim() ||
      $('h1').first().text().trim();

    if (isIrrelevantItem(title, targetUrl, extractSlug(targetUrl))) {
      throw new Error(`Item "${title}" is a blog/tutorial post, not an anime series`);
    }
    const thumbnail =
      $('.thumb img').attr('src') ||
      $('.thumb img').attr('data-src') ||
      $('article img').first().attr('src') ||
      '';

    const rating = $('.rating strong').text().replace(/Rating\s*/i, '').trim();
    const synopsis =
      $('.entry-content p').text().trim() ||
      $('.synp .entry-content').text().trim();

    const genres: string[] = [];
    $('.genxed a').each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });

    const metadata: Record<string, string> = {};
    $('.spe span').each((_, el) => {
      const text = $(el).text().trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx !== -1) {
        const key = text.slice(0, colonIdx).trim();
        const value = text.slice(colonIdx + 1).trim();
        if (key && value) {
          metadata[key] = value;
        }
      }
    });

    const episodes: AnimeDetail['episodes'] = [];
    $('.eplister li a').each((_, el) => {
      const epHref = $(el).attr('href') || '';
      const epTitle = $(el).find('.epl-title').text().trim();
      const epNum = $(el).find('.epl-num').text().trim();
      const epDate = $(el).find('.epl-date').text().trim();

      if (epHref) {
        episodes.push({
          title: epTitle || `Episode ${epNum}`,
          episodeNumber: epNum,
          releaseDate: epDate,
          slug: extractSlug(epHref),
        });
      }
    });

    if (episodes.length === 0 && genres.length === 0 && Object.keys(metadata).length === 0) {
      throw new Error(`Anime not found: "${slugOrUrl}" does not contain anime series data`);
    }

    return {
      title,
      slug: extractSlug(targetUrl),
      thumbnail: normalizeUrl(thumbnail, ANIMEXIN_BASE_URL),
      rating: rating || undefined,
      synopsis,
      genres,
      metadata,
      episodes,
    };
  }

  /**
   * Gets episode stream servers and download links, optionally running extractors
   */
  async getEpisode(slugOrUrl: string, shouldExtract = true): Promise<EpisodeDetail> {
    if (isIrrelevantItem('', slugOrUrl, slugOrUrl)) {
      throw new Error(`Invalid episode slug: "${slugOrUrl}" is not an anime episode`);
    }

    let targetUrl: string;
    if (slugOrUrl.startsWith('http://') || slugOrUrl.startsWith('https://')) {
      targetUrl = slugOrUrl;
    } else {
      const cleanSlug = extractSlug(slugOrUrl);
      targetUrl = `${ANIMEXIN_BASE_URL}/${cleanSlug}/`;
    }

    const html = await fetchHtml(targetUrl, 15000, 600);
    const $ = loadCheerio(html);

    const title =
      $('h1.entry-title').text().trim() ||
      $('h1').text().trim();

    const defaultIframe =
      $('.player-embed iframe, #pembed iframe, iframe[src*="embed"], iframe[src*="video"]')
        .first()
        .attr('src');

    // Decode all mirror options and extract clean URLs (no raw iframe HTML)
    const servers: VideoServer[] = [];
    $('select.mirror option').each((_, el) => {
      const name = $(el).text().trim();
      const val = $(el).attr('value');
      if (val && val.length > 10) {
        const cleanUrl = extractCleanEmbedUrl(val);
        if (cleanUrl) {
          servers.push({
            server: name,
            url: cleanUrl,
          });
        }
      }
    });

    if (servers.length === 0 && defaultIframe) {
      const cleanDefault = extractCleanEmbedUrl(defaultIframe);
      if (cleanDefault) {
        servers.push({
          server: 'Default Server',
          url: cleanDefault,
        });
      }
    }

    // Extract playable media streams from servers concurrently
    let streams: StreamSource[] = [];
    if (shouldExtract && servers.length > 0) {
      try {
        streams = await extractAllServers(servers);
      } catch (err) {
        console.error('Failed to run stream extractors:', err);
      }
    }

    const downloads: DownloadFormat[] = [];
    $('.soraddlx').each((_, box) => {
      $(box).find('.soraurlx').each((_, sub) => {
        const resolution = $(sub).find('strong').text().trim();
        const links: Array<{ server: string; url: string }> = [];

        $(sub).find('a').each((_, a) => {
          const sName = $(a).text().trim();
          const sUrl = $(a).attr('href') || '';
          if (sUrl) {
            links.push({ server: sName, url: sUrl });
          }
        });

        if (resolution && links.length > 0) {
          downloads.push({ resolution, links });
        }
      });
    });

    const prevHref = $('.naveps .nvs a[rel="prev"], .naveps a:contains("Prev")').attr('href');
    const nextHref = $('.naveps .nvs a[rel="next"], .naveps a:contains("Next")').attr('href');
    const allHrefs = $(
      '.naveps .nvsc a, .naveps a[aria-label="All Episodes"], .naveps a[href*="/anime/"], .breadcrumb a[href*="/anime/"]'
    ).attr('href');

    return {
      title,
      slug: extractSlug(targetUrl),
      defaultPlayer: defaultIframe ? normalizeUrl(defaultIframe, ANIMEXIN_BASE_URL) : undefined,
      servers,
      streams,
      downloads,
      navigation: {
        prev: prevHref ? { slug: extractSlug(prevHref) } : undefined,
        next: nextHref ? { slug: extractSlug(nextHref) } : undefined,
        allEpisodes: allHrefs ? { slug: extractSlug(allHrefs) } : undefined,
      },
    };
  }

  /**
   * Gets weekly release dates / schedule
   */
  async getSchedule(): Promise<ScheduleDay[]> {
    const url = `${ANIMEXIN_BASE_URL}/release-date/`;
    const html = await fetchHtml(url, 15000, 1800);
    const $ = loadCheerio(html);

    const schedule: ScheduleDay[] = [];

    $('.listSchh').each((_, el) => {
      const day = $(el).find('h2').text().trim();
      const animeList: Array<{ title: string; slug: string }> = [];

      $(el).find('.subSchh a').each((_, a) => {
        const title = $(a).text().trim();
        const href = $(a).attr('href') || '';
        if (title && href) {
          animeList.push({
            title,
            slug: extractSlug(href),
          });
        }
      });

      if (day && animeList.length > 0) {
        schedule.push({ day, animeList });
      }
    });

    return schedule;
  }

  /**
   * Gets all available genres
   */
  async getGenres(): Promise<GenreItem[]> {
    const url = `${ANIMEXIN_BASE_URL}/genres/`;
    const html = await fetchHtml(url, 15000, 86400);
    const $ = loadCheerio(html);

    const genres: GenreItem[] = [];
    const seen = new Set<string>();

    $('a[href*="/genres/"]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const name = $(a).text().trim();
      const slug = extractSlug(href);

      if (slug && slug !== 'genres' && name && !seen.has(slug)) {
        seen.add(slug);
        genres.push({
          name,
          slug,
        });
      }
    });

    return genres;
  }

  /**
   * Gets anime list by genre
   */
  async getByGenre(genreSlug: string, page = 1): Promise<{ items: AnimeItem[]; hasNextPage: boolean }> {
    const cleanSlug = extractSlug(genreSlug);
    const url =
      page === 1
        ? `${ANIMEXIN_BASE_URL}/genres/${cleanSlug}/`
        : `${ANIMEXIN_BASE_URL}/genres/${cleanSlug}/page/${page}/`;

    const html = await fetchHtml(url, 15000, 900);
    const $ = loadCheerio(html);
    const items: AnimeItem[] = [];

    $('article.bs').each((_, el) => {
      const a = $(el).find('.bsx a');
      const href = a.attr('href') || '';
      const title = a.attr('title') || $(el).find('.tt').text().trim();
      const slug = extractSlug(href);

      // Filter out non-anime articles, tutorials, shortlinks, announcements
      if (isIrrelevantItem(title, href, slug)) {
        return;
      }

      const thumbnail =
        $(el).find('img').attr('src') ||
        $(el).find('img').attr('data-src') ||
        '';

      if (title && href) {
        items.push({
          title,
          slug,
          thumbnail: normalizeUrl(thumbnail, ANIMEXIN_BASE_URL),
          type: $(el).find('.typez').text().trim() || undefined,
          status: $(el).find('.status').text().trim() || undefined,
          latestEpisode: $(el).find('.epx').text().trim() || undefined,
          subType: $(el).find('.sb').text().trim() || undefined,
        });
      }
    });

    const hasNextPage =
      $('.pagination .next').length > 0 ||
      $(`.pagination a[href*="/page/${page + 1}/"]`).length > 0;

    return { items, hasNextPage };
  }
}
