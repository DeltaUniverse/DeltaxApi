import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.ts';
import { NimegamiScraper } from '../src/scrapers/nimegami.ts';

test('NimegamiScraper: getLatest returns parsed anime items', async () => {
  const scraper = new NimegamiScraper();
  const res = await scraper.getLatest(1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0, 'Should find at least 1 latest anime item');

  const first = res.items[0];
  assert.ok(first.title);
  assert.ok(first.slug);
  assert.ok(first.thumbnail.startsWith('https://'));
  assert.equal(typeof res.hasNextPage, 'boolean');
});

test('NimegamiScraper: getPopular returns trending anime items', async () => {
  const scraper = new NimegamiScraper();
  const res = await scraper.getPopular(1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0);
  const first = res.items[0];
  assert.ok(first.title);
  assert.ok(first.slug);
});

test('NimegamiScraper: search returns matching items', async () => {
  const scraper = new NimegamiScraper();
  const res = await scraper.search('one punch', 1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0, 'Should find search results for "one punch"');

  const first = res.items[0];
  assert.ok(first.title);
  assert.ok(first.slug);
});

test('NimegamiScraper: getDetail returns full metadata and episode links', async () => {
  const scraper = new NimegamiScraper();
  const detail = await scraper.getDetail('mizu-zokusei-no-mahoutsukai-sub-indo');
  assert.ok(detail.title.includes('Mizu Zokusei'));
  assert.equal(detail.slug, 'mizu-zokusei-no-mahoutsukai-sub-indo');
  assert.ok(detail.synopsis.length > 0);
  assert.ok(Array.isArray(detail.genres));
  assert.ok(Array.isArray(detail.episodes));
  assert.ok(detail.episodes.length > 0);

  const ep1 = detail.episodes[0];
  assert.ok(ep1.title);
  assert.ok(ep1.slug.includes('mizu-zokusei-no-mahoutsukai-sub-indo'));
});

test('NimegamiScraper: getEpisode returns streams, servers, and downloads', async () => {
  const scraper = new NimegamiScraper();
  const ep = await scraper.getEpisode('mizu-zokusei-no-mahoutsukai-sub-indo', 'episode-1');
  assert.ok(ep.title);
  assert.equal(ep.slug, 'mizu-zokusei-no-mahoutsukai-sub-indo/episode-1');
  assert.ok(Array.isArray(ep.streams));
  assert.ok(Array.isArray(ep.downloads));
  assert.ok(ep.downloads.length > 0, 'Should have download mirrors');

  assert.ok(ep.navigation);
  assert.ok(ep.navigation.allEpisodes);
});

test('NimegamiScraper: getGenres returns genre list', async () => {
  const scraper = new NimegamiScraper();
  const genres = await scraper.getGenres();
  assert.ok(Array.isArray(genres));
  assert.ok(genres.length > 0);
  assert.ok(genres.some((g) => g.slug === 'action'));
});

test('NimegamiScraper: getByGenre returns filtered anime list', async () => {
  const scraper = new NimegamiScraper();
  const res = await scraper.getByGenre('action', 1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0);
  assert.equal(typeof res.hasNextPage, 'boolean');
});

test('NimegamiScraper: getBatch returns batch download mirrors', async () => {
  const scraper = new NimegamiScraper();
  const batch = await scraper.getBatch('mizu-zokusei-no-mahoutsukai-sub-indo');
  assert.ok(batch.title);
  assert.equal(batch.slug, 'mizu-zokusei-no-mahoutsukai-sub-indo');
  assert.ok(Array.isArray(batch.downloads));
});

test('App Endpoint: /v1/nimegami/latest responds with watermark and meta', async () => {
  const res = await app.request('/v1/nimegami/latest?page=1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;

  assert.equal(json.status, 'success');
  assert.equal(json.powered_by, 'deltax');
  assert.equal(json.support_chat, 'https://t.me/DeltaDiscuss');
  assert.ok(Array.isArray(json.data));
});

test('App Endpoint: /v1/nimegami/popular responds', async () => {
  const res = await app.request('/v1/nimegami/popular?page=1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
});

test('App Endpoint: /v1/nimegami/search validation error on empty query', async () => {
  const res = await app.request('/v1/nimegami/search?q=');
  assert.equal(res.status, 400);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'error');
  assert.equal(json.powered_by, 'deltax');
});

test('App Endpoint: /v1/nimegami/search returns non-unified array in data', async () => {
  const res = await app.request('/v1/nimegami/search?q=one+punch&page=1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
  assert.equal(json.powered_by, 'deltax');
});

test('App Endpoint: /v1/:provider/search routes to nimegami', async () => {
  const res = await app.request('/v1/nimegami/search?q=one+punch&page=1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
  const meta = json.meta as Record<string, unknown>;
  assert.equal(meta.provider, 'nimegami.id');
});

test('App Endpoint: /v1/nimegami/detail/:slug responds', async () => {
  const res = await app.request('/v1/nimegami/detail/mizu-zokusei-no-mahoutsukai-sub-indo');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  const data = json.data as Record<string, unknown>;
  assert.ok(data.title);
  assert.equal(data.slug, 'mizu-zokusei-no-mahoutsukai-sub-indo');
});

test('App Endpoint: /v1/nimegami/episode/:animeSlug/:episodeSlug responds', async () => {
  const res = await app.request('/v1/nimegami/episode/mizu-zokusei-no-mahoutsukai-sub-indo/episode-1');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  const data = json.data as Record<string, unknown>;
  assert.ok(Array.isArray(data.streams));
  assert.ok(Array.isArray(data.downloads));
});

test('App Endpoint: /v1/nimegami/genres responds', async () => {
  const res = await app.request('/v1/nimegami/genres');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  assert.ok(Array.isArray(json.data));
});

test('App Endpoint: /v1/nimegami/batch/:slug responds', async () => {
  const res = await app.request('/v1/nimegami/batch/mizu-zokusei-no-mahoutsukai-sub-indo');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  const data = json.data as Record<string, unknown>;
  assert.ok(data.title);
  assert.ok(Array.isArray(data.downloads));
});

test('App Endpoint: /v1/health lists animexin.dev, dramaid.nimegami.id, and nimegami.id', async () => {
  const res = await app.request('/v1/health');
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  const data = json.data as Record<string, unknown>;
  const providers = data.providers as string[];
  assert.ok(providers.includes('animexin.dev'));
  assert.ok(providers.includes('dramaid.nimegami.id'));
  assert.ok(providers.includes('nimegami.id'));
});

test('App Endpoint: /v1/extract resolves Nimegami stream URL', async () => {
  const target = 'https://stream-stor.berkasdrive.com/v/v1.sample';
  const res = await app.request(`/v1/extract?url=${encodeURIComponent(target)}`);
  assert.equal(res.status, 200);
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(json.status, 'success');
  const data = json.data as Array<Record<string, unknown>>;
  assert.ok(data.length > 0);
  assert.equal(data[0].server, 'Nimegami');
  assert.equal(data[0].type, 'video/mp4');
});
