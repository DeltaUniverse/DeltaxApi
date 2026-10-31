import { extractOkru } from './okru.ts';
import { extractDailymotion } from './dailymotion.ts';
import { extractRumble } from './rumble.ts';
import { extractVidhide } from './vidhide.ts';
import { extractPlaymogo } from './playmogo.ts';
import type { VideoServer, StreamSource } from '../types.ts';

export {
  extractOkru,
  extractDailymotion,
  extractRumble,
  extractVidhide,
  extractPlaymogo,
};

/**
 * Extracts playable streams from any supported embed URL
 */
export async function extractUrl(url: string): Promise<StreamSource[]> {
  if (!url) return [];
  const fullUrl = url.startsWith('//') ? `https:${url}` : url;

  let streams: StreamSource[] = [];

  if (fullUrl.includes('ok.ru')) {
    streams = await extractOkru(fullUrl);
  } else if (
    fullUrl.includes('dailymotion.com') ||
    fullUrl.includes('nunadrama')
  ) {
    streams = await extractDailymotion(fullUrl);
  } else if (fullUrl.includes('rumble.com')) {
    streams = await extractRumble(fullUrl);
  } else if (
    fullUrl.includes('vidhide') ||
    fullUrl.includes('morencius.com') ||
    fullUrl.includes('minochinos.com') ||
    fullUrl.includes('bingezove.com') ||
    fullUrl.includes('rubyvidhub.com') ||
    fullUrl.includes('streamruby') ||
    fullUrl.includes('streamwish') ||
    fullUrl.includes('seekplayer')
  ) {
    streams = await extractVidhide(fullUrl);
  } else if (
    fullUrl.includes('playmogo.com') ||
    fullUrl.includes('dood')
  ) {
    streams = await extractPlaymogo(fullUrl);
  } else if (
    fullUrl.includes('dramaid.nimegami.id/api/v1/files/') ||
    fullUrl.includes('berkasdrive.com/stream/')
  ) {
    streams = [
      {
        server: 'DramaID',
        quality: 'Auto',
        url: fullUrl,
        proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(fullUrl)}&referer=${encodeURIComponent('https://dramaid.nimegami.id/')}`,
        type: 'video/mp4',
        headers: {
          Referer: 'https://dramaid.nimegami.id/',
        },
      },
    ];
  } else if (fullUrl.includes('.m3u8') || fullUrl.includes('.mp4')) {
    const isM3u8 = fullUrl.includes('.m3u8');
    streams = [
      {
        server: 'Direct',
        quality: 'Auto',
        url: fullUrl,
        proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(fullUrl)}`,
        type: isM3u8 ? 'application/x-mpegURL' : 'video/mp4',
      },
    ];
  }

  // Ensure all extracted streams have proxyUrl populated
  return streams.map((s) => {
    if (!s.proxyUrl && s.url && s.url.startsWith('http')) {
      const ref = s.headers?.Referer || s.headers?.referer || '';
      const refParam = ref ? `&referer=${encodeURIComponent(ref)}` : '';
      return {
        ...s,
        proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(s.url)}${refParam}`,
      };
    }
    return s;
  });
}

/**
 * Extracts streams for a list of VideoServers concurrently with a per-server timeout
 */
export async function extractAllServers(servers: VideoServer[]): Promise<StreamSource[]> {
  const timeoutMs = 6000;

  const tasks = servers
    .filter((s) => s.url && s.url.startsWith('http'))
    .map((s) => {
      return Promise.race([
        extractUrl(s.url),
        new Promise<StreamSource[]>((resolve) => {
          setTimeout(() => resolve([]), timeoutMs);
        }),
      ]);
    });

  const results = await Promise.allSettled(tasks);
  const streams: StreamSource[] = [];

  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      streams.push(...res.value);
    }
  }

  return streams;
}
