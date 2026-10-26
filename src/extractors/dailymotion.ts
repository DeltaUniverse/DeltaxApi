import { DEFAULT_HEADERS } from '../utils/scraper-client.ts';
import type { StreamSource } from '../types.ts';

export async function extractDailymotion(url: string): Promise<StreamSource[]> {
  const sources: StreamSource[] = [];

  try {
    let videoId: string | undefined;

    // Check query param video=...
    const videoParamMatch = url.match(/[?&]video=([a-zA-Z0-9]+)/i);
    if (videoParamMatch) {
      videoId = videoParamMatch[1];
    } else {
      // Check embed/video/ID or video/ID
      const pathMatch = url.match(/(?:embed\/video|video)\/([a-zA-Z0-9]+)/i);
      if (pathMatch) {
        videoId = pathMatch[1];
      }
    }

    // If still not found and it is nunadrama, fetch nunadrama page to find geo.dailymotion iframe
    if (!videoId && url.includes('nunadrama')) {
      try {
        const res = await fetch(url, {
          headers: DEFAULT_HEADERS,
          signal: AbortSignal.timeout(4000),
        });
        const html = await res.text();
        const iframeMatch = html.match(/video=([a-zA-Z0-9]+)/i);
        if (iframeMatch) {
          videoId = iframeMatch[1];
        }
      } catch {
        // Fallback silently if nunadrama is unreachable
      }
    }

    if (!videoId) return sources;

    const metaUrl = `https://www.dailymotion.com/player/metadata/video/${videoId}`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Referer': 'https://www.dailymotion.com/',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!metaRes.ok) return sources;

    const data = (await metaRes.json()) as {
      error?: unknown;
      qualities?: Record<string, Array<{ type?: string; url?: string }>>;
    };

    if (data.error || !data?.qualities) return sources;

    for (const [qualityKey, streams] of Object.entries(data.qualities)) {
      if (!Array.isArray(streams)) continue;
      for (const item of streams) {
        if (!item?.url || !item.url.startsWith('http')) continue;

        const isHls = item.type?.includes('mpegURL') || item.url.includes('.m3u8');
        let qualityLabel = qualityKey;
        if (qualityKey === 'auto') qualityLabel = 'Auto (HLS)';
        else if (!qualityLabel.endsWith('p') && /^\d+$/.test(qualityLabel)) {
          qualityLabel = `${qualityLabel}p`;
        }

        sources.push({
          server: 'Dailymotion',
          quality: qualityLabel,
          url: item.url,
          proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(item.url)}&referer=https%3A%2F%2Fwww.dailymotion.com%2F`,
          type: isHls ? 'application/x-mpegURL' : (item.type || 'video/mp4'),
          headers: {
            Referer: 'https://www.dailymotion.com/',
          },
        });
      }
    }
  } catch (err) {
    console.warn('Dailymotion extraction notice:', err instanceof Error ? err.message : err);
  }

  return sources;
}
