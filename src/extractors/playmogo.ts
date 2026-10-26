import { DEFAULT_HEADERS } from '../utils/scraper-client.ts';
import type { StreamSource } from '../types.ts';

export async function extractPlaymogo(url: string): Promise<StreamSource[]> {
  const sources: StreamSource[] = [];

  try {
    const res = await fetch(url, {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: 'https://animexin.dev/',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return sources;

    const html = await res.text();
    const passMatch = html.match(/\/pass_md5\/([^/]+)\/([^/'"\\s]+)/i);
    if (!passMatch) return sources;

    const passPath = passMatch[0];
    const token = passMatch[2];

    const passRes = await fetch(`https://playmogo.com${passPath}`, {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: url,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!passRes.ok) return sources;

    const videoBase = (await passRes.text()).trim();
    if (!videoBase || !videoBase.startsWith('http')) return sources;

    const expiry = String(Date.now() + 86400000);
    const videoUrl = videoBase.endsWith('~')
      ? `${videoBase}${token}?token=${token}&expiry=${expiry}`
      : videoBase;

    sources.push({
      server: 'DoodStream',
      quality: 'Auto',
      url: videoUrl,
      proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(videoUrl)}&referer=https%3A%2F%2Fplaymogo.com%2F`,
      type: 'video/mp4',
      headers: {
        Referer: 'https://playmogo.com/',
      },
    });
  } catch (err) {
    console.warn('Playmogo extraction notice:', err instanceof Error ? err.message : err);
  }

  return sources;
}
