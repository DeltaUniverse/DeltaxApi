import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.ts';
import { DramaIdScraper } from '../src/scrapers/dramaid.ts';

test('DramaIdScraper: getLatest returns parsed drama items', async () => {
  const scraper = new DramaIdScraper();
  const res = await scraper.getLatest(1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0, 'Should find at least 1 latest drama item');

  const first = res.items[0];
  assert.ok(first.title);
  assert.ok(first.slug);
  assert.ok(first.thumbnail.startsWith('https://dramaid.nimegami.id'));
  assert.equal(typeof res.hasNextPage, 'boolean');
});

test('DramaIdScraper: getPopular returns trending drama items', async () => {
  const scraper = new DramaIdScraper();
  const res = await scraper.getPopular(1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0);
  const first = res.items[0];
  assert.ok(first.title);
  assert.ok(first.slug);
});

test('DramaIdScraper: search returns matching items', async () => {
  const scraper = new DramaIdScraper();
  const res = await scraper.search('love', 1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0, 'Should find search results for "love"');

  const first = res.items[0];
  assert.ok(first.title);
  assert.ok(first.slug);
});

test('DramaIdScraper: getDetail returns full metadata and episode links', async () => {
  const scraper = new DramaIdScraper();
  const detail = await scraper.getDetail('tigers-sniff-the-rose-2026');
  assert.ok(detail.title.includes('Tigers Sniff the Rose'));
  assert.equal(detail.slug, 'tigers-sniff-the-rose-2026');
  assert.ok(detail.synopsis.length > 0);
  assert.ok(Array.isArray(detail.genres));
  assert.ok(Array.isArray(detail.cast));
  assert.ok(Array.isArray(detail.episodes));
  assert.ok(detail.episodes.length > 0);

  const ep1 = detail.episodes[0];
  assert.ok(ep1.title);
  assert.ok(ep1.slug.includes('tigers-sniff-the-rose-2026'));
});

test('DramaIdScraper: getEpisode returns streams, servers, and downloads', async () => {
  const scraper = new DramaIdScraper();
  const ep = await scraper.getEpisode('tigers-sniff-the-rose-2026', 'episode-1');
  assert.ok(ep.title);
  assert.equal(ep.slug, 'tigers-sniff-the-rose-2026/episode-1');
  assert.ok(Array.isArray(ep.streams));
  assert.ok(ep.streams.length > 0, 'Should have at least 1 stream');

  const stream = ep.streams[0];
  assert.equal(stream.server, 'DramaID');
  assert.equal(stream.type, 'video/mp4');
  assert.ok(stream.url.includes('/api/v1/files/'));
  assert.ok(stream.proxyUrl?.includes('/v1/stream/proxy'));

  assert.ok(Array.isArray(ep.downloads));
  assert.ok(ep.downloads.length > 0);

  assert.ok(ep.navigation);
  assert.ok(ep.navigation.allEpisodes);
});

test('DramaIdScraper: getGenres returns genre list', async () => {
  const scraper = new DramaIdScraper();
  const genres = await scraper.getGenres();
  assert.ok(Array.isArray(genres));
  assert.ok(genres.length > 0);
  assert.ok(genres.some((g) => g.slug === 'romance'));
});

test('DramaIdScraper: getCountries returns country list', async () => {
  const scraper = new DramaIdScraper();
  const countries = await scraper.getCountries();
  assert.ok(Array.isArray(countries));
  assert.ok(countries.length > 0);
  assert.ok(countries.some((c) => c.slug === 'south-korea' || c.slug === 'china' || c.slug === 'japan'));
});

test('App Endpoint: /v1/dramaid/latest responds with watermark and meta', async () => {
  const res = await app.request('/v1/dramaid/latest?page=1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;

  assert.equal(json.status, 'success');
  assert.equal(json.powered_by, 'deltax');
  assert.equal(json.support_chat, 'https://t.me/DeltaDiscuss');
  assert.ok(Array.isArray(json.data));
});

test('App Endpoint: /v1/dramaid/popular responds', async () => {
  const res = await app.request('/v1/dramaid/popular?page=1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
});

test('App Endpoint: /v1/dramaid/search validation error on empty query', async () => {
  const res = await app.request('/v1/dramaid/search?q=');
  assert.equal(res.status, 400);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'error');
  assert.equal(json.powered_by, 'deltax');
});

test('App Endpoint: /v1/dramaid/search returns non-unified array in data', async () => {
  const res = await app.request('/v1/dramaid/search?q=love&page=1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
  assert.equal(json.powered_by, 'deltax');
});

test('App Endpoint: /v1/:provider/search routes to dramaid', async () => {
  const res = await app.request('/v1/dramaid/search?q=love&page=1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
  const meta = json.meta as Record<string, unknown>;
  assert.equal(meta.provider, 'dramaid.nimegami.id');
});

test('App Endpoint: /v1/dramaid/detail/:slug responds', async () => {
  const res = await app.request('/v1/dramaid/detail/tigers-sniff-the-rose-2026');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  const data = json.data as Record<string, unknown>;
  assert.ok(data.title);
  assert.equal(data.slug, 'tigers-sniff-the-rose-2026');
});

test('App Endpoint: /v1/dramaid/episode/:dramaSlug/:episodeSlug responds', async () => {
  const res = await app.request('/v1/dramaid/episode/tigers-sniff-the-rose-2026/episode-1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  const data = json.data as Record<string, unknown>;
  assert.ok(Array.isArray(data.streams));
  assert.ok(Array.isArray(data.downloads));
});

test('App Endpoint: /v1/dramaid/genres responds', async () => {
  const res = await app.request('/v1/dramaid/genres');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
});

test('App Endpoint: /v1/dramaid/countries responds', async () => {
  const res = await app.request('/v1/dramaid/countries');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
});

test('App Endpoint: /v1/health lists both animexin.dev and dramaid.nimegami.id', async () => {
  const res = await app.request('/v1/health');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  const data = json.data as Record<string, unknown>;
  const providers = data.providers as string[];
  assert.ok(providers.includes('animexin.dev'));
  assert.ok(providers.includes('dramaid.nimegami.id'));
});

test('App Endpoint: /v1/extract resolves DramaID stream URL', async () => {
  const target = 'https://dramaid.nimegami.id/api/v1/files/324/stream';
  const res = await app.request(`/v1/extract?url=${encodeURIComponent(target)}`);
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  const data = json.data as Array<Record<string, unknown>>;
  assert.ok(data.length > 0);
  assert.equal(data[0].server, 'DramaID');
  assert.equal(data[0].type, 'video/mp4');
});
