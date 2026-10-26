import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.ts';
import { extractCleanEmbedUrl, extractSlug, normalizeUrl, isIrrelevantItem } from '../src/utils/scraper-client.ts';

test('Watermark & Structure: Root endpoint', async () => {
  const res = await app.request('/');
  assert.equal(res.status, 200);
  const json = await res.json() as Record<string, unknown>;

  assert.equal(json.status, 'success');
  assert.equal(json.statusCode, 200);
  assert.ok(json.data);

  // Check watermark values
  assert.equal(json.powered_by, 'deltax');
  assert.equal(json.support_chat, 'https://t.me/DeltaDiscuss');

  // Verify watermark keys are at the bottom (last keys in JSON serialization)
  const keys = Object.keys(json);
  assert.equal(keys[keys.length - 2], 'powered_by');
  assert.equal(keys[keys.length - 1], 'support_chat');
});

test('Watermark & Structure: Health check /v1/health', async () => {
  const res = await app.request('/v1/health');
  assert.equal(res.status, 200);
  const json = await res.json() as Record<string, unknown>;

  assert.equal(json.status, 'success');
  assert.equal(json.statusCode, 200);
  assert.ok(json.data);
  const data = json.data as Record<string, unknown>;
  assert.equal(data.status, 'healthy');
  assert.equal(data.service, 'DeltaxApi');

  assert.equal(json.powered_by, 'deltax');
  assert.equal(json.support_chat, 'https://t.me/DeltaDiscuss');

  const keys = Object.keys(json);
  assert.equal(keys[keys.length - 2], 'powered_by');
  assert.equal(keys[keys.length - 1], 'support_chat');
});

test('Watermark & Structure: 404 Not Found', async () => {
  const res = await app.request('/non-existent-route');
  assert.equal(res.status, 404);
  const json = await res.json() as Record<string, unknown>;

  assert.equal(json.status, 'error');
  assert.equal(json.statusCode, 404);
  assert.ok(json.message);

  assert.equal(json.powered_by, 'deltax');
  assert.equal(json.support_chat, 'https://t.me/DeltaDiscuss');

  const keys = Object.keys(json);
  assert.equal(keys[keys.length - 2], 'powered_by');
  assert.equal(keys[keys.length - 1], 'support_chat');
});

test('Watermark & Structure: Zod Validation Error (empty search query)', async () => {
  const res = await app.request('/v1/animexin/search?q=');
  assert.equal(res.status, 400);
  const json = await res.json() as Record<string, unknown>;

  assert.equal(json.status, 'error');
  assert.equal(json.statusCode, 400);
  assert.ok(json.errors);

  assert.equal(json.powered_by, 'deltax');
  assert.equal(json.support_chat, 'https://t.me/DeltaDiscuss');

  const keys = Object.keys(json);
  assert.equal(keys[keys.length - 2], 'powered_by');
  assert.equal(keys[keys.length - 1], 'support_chat');
});

test('Scraper Utils: clean embed URL extraction (no raw iframe HTML)', () => {
  const rawHtml = '<iframe src="https://player.nunadrama.sbs/test" width="640" height="360"></iframe>';
  const encoded = Buffer.from(rawHtml).toString('base64');
  const cleanUrl = extractCleanEmbedUrl(encoded);

  assert.equal(cleanUrl, 'https://player.nunadrama.sbs/test');
});

test('Scraper Utils: isIrrelevantItem filters out tutorial & blog posts', () => {
  assert.equal(isIrrelevantItem('Cara Download di Animexin', 'https://animexin.dev/how-to-download/'), true);
  assert.equal(isIrrelevantItem('', '', 'tutorial-cara-melewati-shortlink'), true);

  // Valid anime should NOT be filtered
  assert.equal(isIrrelevantItem('Supreme God Emperor', '/anime/supreme-god-emperor/'), false);
  assert.equal(isIrrelevantItem('Battle Through the Heavens', '/anime/btth/'), false);
  assert.equal(isIrrelevantItem('Renegade Immortal', '/anime/renegade-immortal/'), false);
});

test('API Rejection: /v1/animexin/detail/how-to-download returns 404', async () => {
  const res = await app.request('/v1/animexin/detail/how-to-download');
  assert.equal(res.status, 404);
  const json = await res.json() as Record<string, unknown>;
  assert.equal(json.status, 'error');
  assert.equal(json.powered_by, 'deltax');
  assert.equal(json.support_chat, 'https://t.me/DeltaDiscuss');
});

test('Stream Proxy: Options preflight & 400 validation', async () => {
  // Test OPTIONS preflight
  const optRes = await app.request('/v1/stream/proxy', { method: 'OPTIONS' });
  assert.equal(optRes.status, 204);
  assert.equal(optRes.headers.get('access-control-allow-origin'), '*');

  // Test missing URL
  const errRes = await app.request('/v1/stream/proxy');
  assert.equal(errRes.status, 400);

  // Test invalid URL protocol
  const invalidRes = await app.request('/v1/stream/proxy?url=ftp://bad');
  assert.equal(invalidRes.status, 400);
});

test('Popular & Trending Route: Animexin popular endpoint responds', async () => {
  const res = await app.request('/v1/animexin/popular?page=1');
  assert.equal(res.status, 200);
  const json = await res.json() as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.equal(json.powered_by, 'deltax');
  assert.ok(Array.isArray(json.data));
});

test('Search: /v1/search without provider returns 400 rejecting unified search', async () => {
  const res = await app.request('/v1/search?q=battle');
  assert.equal(res.status, 400);
  const json = await res.json() as Record<string, unknown>;
  assert.equal(json.status, 'error');
  assert.ok(String(json.message).includes('Unified search is disabled'));
});

test('Search: /v1/:provider/search with unknown provider returns 400', async () => {
  const res = await app.request('/v1/unknown-provider/search?q=battle');
  assert.equal(res.status, 400);
  const json = await res.json() as Record<string, unknown>;
  assert.equal(json.status, 'error');
  assert.ok(String(json.message).includes('Unknown provider'));
});

test('Search: /v1/animexin/search returns non-unified array in data', async () => {
  const res = await app.request('/v1/animexin/search?q=battle&page=1');
  assert.equal(res.status, 200);
  const json = await res.json() as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data), 'Data must be a non-unified array of anime items');
  assert.equal(json.powered_by, 'deltax');
  assert.equal(json.support_chat, 'https://t.me/DeltaDiscuss');
});

test('Scalar Documentation: /docs returns HTML interactive UI', async () => {
  const res = await app.request('/docs');
  assert.equal(res.status, 200);
  const contentType = res.headers.get('content-type') || '';
  assert.ok(contentType.includes('text/html'));
  const html = await res.text();
  assert.ok(html.includes('scalar') || html.includes('Scalar'));
});

test('Scalar Documentation: /reference returns HTML interactive UI', async () => {
  const res = await app.request('/reference');
  assert.equal(res.status, 200);
  const contentType = res.headers.get('content-type') || '';
  assert.ok(contentType.includes('text/html'));
  const html = await res.text();
  assert.ok(html.includes('scalar') || html.includes('Scalar'));
});

test('OpenAPI Specification: /openapi.json returns valid 3.1.0 spec', async () => {
  const res = await app.request('/openapi.json');
  assert.equal(res.status, 200);
  const json = await res.json() as Record<string, unknown>;
  assert.equal(json.openapi, '3.1.0');
  assert.ok(json.info);
  assert.ok(json.paths);
});

test('Browser Redirection: / redirects HTML clients to /docs', async () => {
  const res = await app.request('/', {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/docs');
});


