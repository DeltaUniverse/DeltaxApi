import { DEFAULT_HEADERS } from '../utils/scraper-client.ts';
import type { StreamSource } from '../types.ts';

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function intToBase(num: number, base: number): string {
  if (num === 0) return '0';
  let res = '';
  while (num > 0) {
    res = BASE62_CHARS[num % base] + res;
    num = Math.floor(num / base);
  }
  return res;
}

/**
 * Unpacks Dean Edwards P.A.C.K.E.R. JavaScript
 */
export function unpackPacker(packedJs: string): string | null {
  const match = packedJs.match(
    /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)\s*\{[\s\S]*?\}\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\s*\.split\s*\(\s*'\|\s*'\s*\)\s*\)/i
  );
  if (!match) return null;

  const encoded = match[1];
  const radix = parseInt(match[2], 10);
  const count = parseInt(match[3], 10);
  const dictionary = match[4].split('|');

  let result = encoded;
  for (let i = count - 1; i >= 0; i--) {
    const replacement = dictionary[i];
    if (replacement) {
      const word = intToBase(i, radix);
      const reg = new RegExp(`\\b${word}\\b`, 'g');
      result = result.replace(reg, replacement);
    }
  }

  return result;
}

export async function extractVidhide(url: string): Promise<StreamSource[]> {
  const sources: StreamSource[] = [];

  try {
    const res = await fetch(url, {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: 'https://animexin.dev/',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return sources;

    const html = await res.text();

    // Check for packed JS
    const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\('\|'\)\)\)/i);
    let unpacked = '';
    if (packedMatch) {
      unpacked = unpackPacker(packedMatch[0]) || '';
    }

    const textToSearch = unpacked || html;

    // Search for m3u8 file in unpacked script or HTML
    const fileMatch = textToSearch.match(/['"]?file['"]?\s*:\s*['"]((?:[^'"]|\\.)*)['"]/i);
    let streamUrl = fileMatch ? fileMatch[1].replace(/\\/g, '') : undefined;

    if (!streamUrl) {
      const m3u8Match = textToSearch.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
      if (m3u8Match) {
        streamUrl = m3u8Match[0];
      }
    }

    if (streamUrl && streamUrl.startsWith('http')) {
      sources.push({
        server: 'VidHide',
        quality: 'Auto (HLS)',
        url: streamUrl,
        proxyUrl: `/v1/stream/proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(url)}`,
        type: 'application/x-mpegURL',
        headers: {
          Referer: url,
        },
      });
    }
  } catch (err) {
    console.warn('Vidhide extraction notice:', err instanceof Error ? err.message : err);
  }

  return sources;
}
