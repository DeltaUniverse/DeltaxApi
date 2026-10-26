import { Hono } from 'hono';
import { sendError } from '../utils/response.ts';

export const streamRoute = new Hono();

const PROXY_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function inferReferer(url: string, explicitReferer?: string): string {
  if (explicitReferer) return explicitReferer;
  const lower = url.toLowerCase();
  if (lower.includes('vkuser.net') || lower.includes('ok.ru')) {
    return 'https://ok.ru/';
  }
  if (lower.includes('dailymotion') || lower.includes('dmcdn.net')) {
    return 'https://www.dailymotion.com/';
  }
  if (lower.includes('odysee') || lower.includes('odycdn')) {
    return 'https://odysee.com/';
  }
  if (lower.includes('rumble')) {
    return 'https://rumble.com/';
  }
  if (
    lower.includes('vidhide') ||
    lower.includes('streamruby') ||
    lower.includes('rubyvidhub') ||
    lower.includes('minochinos') ||
    lower.includes('bingezove')
  ) {
    return 'https://animexin.dev/';
  }
  return '';
}

// OPTIONS preflight support
streamRoute.options('/proxy', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
});

// GET & HEAD /v1/stream/proxy?url=...&referer=...
streamRoute.all('/proxy', async (c) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    return sendError(c, 'Method Not Allowed', 405);
  }

  const rawUrl = c.req.query('url')?.trim();
  if (!rawUrl) {
    return sendError(c, 'Query parameter "url" is required', 400);
  }

  let targetUrl: string;
  try {
    targetUrl = rawUrl.startsWith('http') ? rawUrl : decodeURIComponent(rawUrl);
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return sendError(c, 'Invalid stream URL protocol', 400);
    }
  } catch {
    return sendError(c, 'Invalid stream URL encoding', 400);
  }

  const explicitReferer = c.req.query('referer')?.trim();
  const referer = inferReferer(targetUrl, explicitReferer);
  const rangeHeader = c.req.header('range');

  const upstreamHeaders: Record<string, string> = {
    'User-Agent': PROXY_USER_AGENT,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  if (referer) {
    upstreamHeaders['Referer'] = referer;
    upstreamHeaders['Origin'] = new URL(referer).origin;
  }

  if (rangeHeader) {
    upstreamHeaders['Range'] = rangeHeader;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: c.req.method,
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const contentType =
      c.req.query('type') ||
      upstreamRes.headers.get('content-type') ||
      (targetUrl.includes('.m3u8')
        ? 'application/x-mpegURL'
        : targetUrl.includes('.mp4')
          ? 'video/mp4'
          : 'application/octet-stream');

    const isM3u8 =
      contentType.includes('mpegURL') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      targetUrl.includes('.m3u8');

    // For HLS playlists: rewrite relative or sub-segment URIs to route through the proxy
    if (isM3u8 && c.req.method === 'GET' && upstreamRes.ok) {
      const playlistText = await upstreamRes.text();
      const rewritten = playlistText
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) {
            return line;
          }
          try {
            const resolved = new URL(trimmed, targetUrl).href;
            return `/v1/stream/proxy?url=${encodeURIComponent(resolved)}&referer=${encodeURIComponent(referer)}`;
          } catch {
            return line;
          }
        })
        .join('\n');

      return new Response(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-mpegURL',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization, Accept',
          'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Binary media stream (mp4, ts segments, audio, etc.)
    const clientHeaders = new Headers();
    clientHeaders.set('Access-Control-Allow-Origin', '*');
    clientHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    clientHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, Accept');
    clientHeaders.set(
      'Access-Control-Expose-Headers',
      'Content-Range, Content-Length, Accept-Ranges, Content-Type'
    );
    clientHeaders.set('Content-Type', contentType);
    clientHeaders.set('Accept-Ranges', 'bytes');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      clientHeaders.set('Content-Length', contentLength);
    }

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      clientHeaders.set('Content-Range', contentRange);
    }

    const cacheControl = upstreamRes.headers.get('cache-control');
    if (cacheControl) {
      clientHeaders.set('Cache-Control', cacheControl);
    } else {
      clientHeaders.set('Cache-Control', 'public, max-age=3600');
    }

    return new Response(c.req.method === 'HEAD' ? null : upstreamRes.body, {
      status: upstreamRes.status,
      headers: clientHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Streaming proxy fetch error';
    return sendError(c, `Proxy failed: ${msg}`, 502);
  }
});
