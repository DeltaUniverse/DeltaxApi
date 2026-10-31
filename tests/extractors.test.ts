import test from 'node:test';
import assert from 'node:assert/strict';
import { unpackPacker } from '../src/extractors/vidhide.ts';
import { extractOkru } from '../src/extractors/okru.ts';
import { extractDailymotion } from '../src/extractors/dailymotion.ts';
import { extractUrl } from '../src/extractors/index.ts';

test('Vidhide Extractor: Dean Edwards P.A.C.K.E.R. unpacker', () => {
  // Simple packed JS sample
  const samplePacked = "eval(function(p,a,c,k,e,d){return p}('0 1 2',3,3,'hello|world|test'.split('|')))";
  const unpacked = unpackPacker(samplePacked);
  assert.equal(unpacked, 'hello world test');
});

test('Okru Extractor: extracts multiple quality streams from ok.ru embed', async () => {
  const url = 'https://ok.ru/videoembed/16247866329778';
  const streams = await extractOkru(url);

  assert.ok(Array.isArray(streams));
  assert.ok(streams.length > 0, 'Should extract at least 1 stream from ok.ru');

  const mp4Stream = streams.find((s) => s.type === 'video/mp4');
  assert.ok(mp4Stream, 'Should extract MP4 video stream');
  assert.equal(mp4Stream.server, 'Okru');
  assert.ok(mp4Stream.url.startsWith('https://'));
  assert.ok(mp4Stream.quality);
  assert.ok(mp4Stream.proxyUrl?.includes('/v1/stream/proxy'));

  const hlsStream = streams.find((s) => s.type === 'application/x-mpegURL');
  assert.ok(hlsStream, 'Should extract HLS master manifest stream');
  assert.ok(hlsStream.proxyUrl?.includes('/v1/stream/proxy'));
});

test('Dailymotion Extractor: extracts HLS stream from video ID or nunadrama', async () => {
  const url = 'https://geo.dailymotion.com/player/xhojl.html?video=k1H9W4v19hY8L0M4G18';
  const streams = await extractDailymotion(url);

  assert.ok(Array.isArray(streams));
  assert.ok(streams.length > 0, 'Should extract stream from Dailymotion');

  const hls = streams.find((s) => s.type === 'application/x-mpegURL');
  assert.ok(hls, 'Should have an HLS master playlist');
  assert.ok(hls.url.includes('.m3u8'));
});

test('Unified extractUrl: routes correctly to extractors', async () => {
  const dmStreams = await extractUrl('https://geo.dailymotion.com/player/xhojl.html?video=k1H9W4v19hY8L0M4G18');
  assert.ok(dmStreams.length > 0);

  const direct = await extractUrl('https://example.com/video.m3u8');
  assert.equal(direct.length, 1);
  assert.equal(direct[0].server, 'Direct');
});
