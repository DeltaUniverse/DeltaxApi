import { DEFAULT_HEADERS } from '../utils/scraper-client.ts';
import type { StreamSource } from '../types.ts';

export async function extractRumble(url: string): Promise<StreamSource[]> {
  const sources: StreamSource[] = [];

  try {
    const match = url.match(/(?:embed\/|v=)([a-zA-Z0-9]+)/i);
    if (!match) return sources;
    const videoId = match[1];

    const apiUrl = `https://rumble.com/embedJS/u3/?request=video&v=${videoId}`;
    const res = await fetch(apiUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: url,
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        ua?: Record<string, unknown[]>;
        u?: {
          mp4?: {
            url?: string;
          };
        };
      };

      const ua = data?.ua;
      if (ua && typeof ua === 'object') {
        for (const [key, val] of Object.entries(ua)) {
          if (!Array.isArray(val) || !val[0]) continue;
          const streamUrl = String(val[0]);
          if (!streamUrl.startsWith('http')) continue;

          sources.push({
            server: 'Rumble',
            quality: `${key}p`,
            url: streamUrl,
            proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(streamUrl)}&referer=https%3A%2F%2Frumble.com%2F`,
            type: streamUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
            headers: {
              Referer: 'https://rumble.com/',
            },
          });
        }
      }

      if (sources.length === 0 && data?.u?.mp4?.url) {
        const streamUrl = data.u.mp4.url;
        sources.push({
          server: 'Rumble',
          quality: 'Default',
          url: streamUrl,
          proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(streamUrl)}&referer=https%3A%2F%2Frumble.com%2F`,
          type: 'video/mp4',
          headers: {
            Referer: 'https://rumble.com/',
          },
        });
      }
    }
  } catch (err) {
    console.warn('Rumble extraction notice:', err instanceof Error ? err.message : err);
  }

  return sources;
}
