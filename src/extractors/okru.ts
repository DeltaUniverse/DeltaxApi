import { DEFAULT_HEADERS } from '../utils/scraper-client.ts';
import type { StreamSource } from '../types.ts';

export async function extractOkru(url: string): Promise<StreamSource[]> {
  const sources: StreamSource[] = [];
  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return sources;

    const html = await res.text();
    const optsMatch = html.match(/data-options=["']([^"']+)["']/i);
    if (!optsMatch) return sources;

    const jsonStr = optsMatch[1].replace(/&quot;/g, '"');
    const root = JSON.parse(jsonStr) as {
      flashvars?: {
        metadata?: unknown;
      };
    };

    let metadata = root.flashvars?.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        return sources;
      }
    }

    const metaObj = metadata as {
      hlsManifestUrl?: string;
      videos?: Array<{
        name?: string;
        url?: string;
      }>;
    };

    // Extract HLS master manifest if present
    if (metaObj?.hlsManifestUrl && metaObj.hlsManifestUrl.startsWith('http')) {
      const hlsUrl = metaObj.hlsManifestUrl;
      sources.push({
        server: 'Okru',
        quality: 'Auto (HLS)',
        url: hlsUrl,
        proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(hlsUrl)}&referer=https%3A%2F%2Fok.ru%2F`,
        type: 'application/x-mpegURL',
        headers: {
          Referer: 'https://ok.ru/',
        },
      });
    }

    if (Array.isArray(metaObj?.videos)) {
      const qualityMap: Record<string, { label: string; order: number }> = {
        full: { label: '1080p', order: 1 },
        hd: { label: '720p', order: 2 },
        sd: { label: '480p', order: 3 },
        low: { label: '360p', order: 4 },
        lowest: { label: '240p', order: 5 },
        mobile: { label: '144p', order: 6 },
      };

      const sortedVideos = [...metaObj.videos].sort((a, b) => {
        const orderA = qualityMap[(a?.name || '').toLowerCase()]?.order ?? 99;
        const orderB = qualityMap[(b?.name || '').toLowerCase()]?.order ?? 99;
        return orderA - orderB;
      });

      for (const v of sortedVideos) {
        if (!v?.url || !v.url.startsWith('http')) continue;
        const rawName = (v.name || 'sd').toLowerCase();
        const quality = qualityMap[rawName]?.label || '480p';

        sources.push({
          server: 'Okru',
          quality,
          url: v.url,
          proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(v.url)}&referer=https%3A%2F%2Fok.ru%2F`,
          type: 'video/mp4',
          headers: {
            Referer: 'https://ok.ru/',
          },
        });
      }
    }
  } catch (err) {
    // Graceful error suppression with warning
    console.warn('Okru extraction notice:', err instanceof Error ? err.message : err);
  }

  return sources;
}
