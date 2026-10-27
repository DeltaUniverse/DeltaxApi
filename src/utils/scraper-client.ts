import * as cheerio from 'cheerio';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const DEFAULT_HEADERS = {
  'User-Agent': DEFAULT_USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export async function fetchHtml(
  url: string,
  timeoutMs = 15000,
  cacheTtl?: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  if (cacheTtl && cacheTtl > 0) {
    delete headers['Cache-Control'];
    delete headers['Pragma'];
  }

  const fetchInit: RequestInit & { cf?: Record<string, unknown> } = {
    headers,
    signal: controller.signal,
  };

  if (cacheTtl && cacheTtl > 0) {
    fetchInit.cf = {
      cacheTtl,
      cacheEverything: true,
    };
  }

  try {
    const res = await fetch(url, fetchInit);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const ray = res.headers.get('cf-ray') || 'none';
      const server = res.headers.get('server') || 'none';
      const titleMatch = errBody.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'No title';
      const rayMatch = errBody.match(/Ray ID:?\s*<code>?([a-zA-Z0-9]+)/i);
      const blockedRay = rayMatch ? rayMatch[1] : ray;
      throw new Error(`Failed to fetch ${url} - Status: ${res.status} ${res.statusText} [Server: ${server}, Title: ${title}, Ray: ${blockedRay}]`);
    }

    return await res.text();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms for ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function loadCheerio(html: string) {
  return cheerio.load(html);
}

/**
 * Extracts slug from a URL path, e.g.
 * '/anime/supreme-god-emperor/' -> 'supreme-god-emperor'
 * 'https://anichin.moe/episode-1/' -> 'episode-1'
 */
export function extractSlug(url: string): string {
  if (!url) return '';
  const clean = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const segments = clean.split('/');
  return segments[segments.length - 1] || '';
}

/**
 * Normalizes relative URLs to full target URLs
 */
export function normalizeUrl(pathOrUrl: string, baseUrl: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  const base = baseUrl.replace(/\/+$/, '');
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

/**
 * Safely decodes base64 string and extracts clean stream or embed URL (no raw iframe HTML)
 */
export function extractCleanEmbedUrl(encodedOrHtml: string): string | undefined {
  if (!encodedOrHtml) return undefined;
  const raw = encodedOrHtml.trim();

  // If already a clean URL
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (raw.startsWith('//')) {
    return `https:${raw}`;
  }

  // Try base64 decoding
  let decoded = raw;
  try {
    const cleanB64 = raw.replace(/\s+/g, '');
    if (typeof atob === 'function') {
      decoded = atob(cleanB64);
    } else {
      decoded = Buffer.from(cleanB64, 'base64').toString('utf-8');
    }
  } catch {
    decoded = raw;
  }

  // Extract src from <iframe src="..."> or <source src="..."> or direct URL
  const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
  let finalUrl = srcMatch ? srcMatch[1] : undefined;

  if (!finalUrl) {
    const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch) {
      finalUrl = urlMatch[0];
    }
  }

  if (finalUrl?.startsWith('//')) {
    finalUrl = `https:${finalUrl}`;
  }

  return finalUrl;
}

/**
 * Checks whether an item, URL, or title is an irrelevant non-anime post
 * (e.g. blog posts, tutorials, shortlink guides, announcements, DMCA, etc.)
 */
export function isIrrelevantItem(title?: string, url?: string, slug?: string): boolean {
  const lowerTitle = (title || '').toLowerCase().trim();
  const lowerUrl = (url || '').toLowerCase().trim();
  const lowerSlug = (slug || '').toLowerCase().trim();

  // Block URLs containing blog or non-anime paths
  if (
    lowerUrl.includes('/blog/') ||
    lowerUrl.includes('/category/') ||
    lowerUrl.includes('/tag/') ||
    lowerUrl.includes('/author/') ||
    lowerUrl.includes('/tutorial') ||
    lowerUrl.includes('/how-to') ||
    lowerUrl.includes('/faq') ||
    lowerUrl.includes('/help') ||
    lowerUrl.includes('/privacy-policy') ||
    lowerUrl.includes('/terms') ||
    lowerUrl.includes('/contact') ||
    lowerUrl.includes('/bookmark') ||
    lowerUrl.includes('/dmca') ||
    lowerUrl.includes('/disclaimer')
  ) {
    return true;
  }

  // Block keywords typically found in tutorials, ads, and announcements
  const blockedPatterns = [
    /tutorial/i,
    /cara\s+melewati/i,
    /cara\s+download/i,
    /cara\s+nonton/i,
    /cara\s+mengatasi/i,
    /shortlink/i,
    /lewati\s+shortlink/i,
    /download\s+apk/i,
    /apk\s+anichin/i,
    /aplikasi\s+anichin/i,
    /aplikasi\s+animexin/i,
    /donasi/i,
    /pengumuman/i,
    /maintenance/i,
    /limit\s+google\s+drive/i,
    /lapor\s+link/i,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(lowerTitle) || pattern.test(lowerSlug)) {
      return true;
    }
  }

  return false;
}

// Deprecated alias for backwards compatibility
export const decodeBase64Iframe = extractCleanEmbedUrl;
