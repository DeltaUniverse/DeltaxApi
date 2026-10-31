import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimexinScraper } from '../src/scrapers/animexin.ts';

test('AnimexinScraper: getLatest returns parsed anime items', async () => {
  const scraper = new AnimexinScraper();
  const res = await scraper.getLatest(1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0, 'Should find at least 1 latest item from animexin');

  const first = res.items[0];
  assert.ok(first.title);
  assert.ok(first.slug);
});

test('AnimexinScraper: search returns matching items', async () => {
  const scraper = new AnimexinScraper();
  const res = await scraper.search('battle', 1);
  assert.ok(Array.isArray(res.items));
  assert.ok(res.items.length > 0, 'Should find search results for "battle"');

  const first = res.items[0];
  assert.ok(first.title);
  assert.ok(first.slug);
});
