<div align="center">

# DeltaxApi

**Edge-native Anime, Donghua & Asian Drama Scraper API for Animexin, Nimegami, and DramaID, featuring multi-host video stream extractors and interactive Scalar documentation.**

[![Runtime](https://img.shields.io/badge/Runtime-Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Framework](https://img.shields.io/badge/Framework-Hono_v4-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Documentation](https://img.shields.io/badge/Docs-Scalar-000000?logo=scalar&logoColor=white)](https://api.deltax.bond/docs)
[![Validation](https://img.shields.io/badge/Validation-Zod-3E67B1?logo=zod&logoColor=white)](https://zod.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

</div>

---

DeltaxApi is an asynchronous, edge-first REST API built with Hono and deployed on Cloudflare Workers. It provides real-time content aggregation for anime, donghua, and Asian dramas from Animexin and DramaID (`dramaid.nimegami.id`), embedded video stream resolution (DramaID MP4s, Ok.ru multi-quality MP4s, Dailymotion master HLS `.m3u8` playlists, and unpacked P.A.C.K.E.R. sources), a CORS-friendly media proxy, and interactive OpenAPI documentation powered by Scalar.

## Design Highlights

### 1. Edge-First Asynchronous Scraping
Optimized for V8 isolates with minimal memory overhead, parsing remote HTML via Cheerio and returning strictly typed, validated JSON structures.

### 2. Multi-Host Stream Resolution
Resolves raw video iframe embed URLs and streaming file endpoints into playable direct media streams (such as DramaID direct MP4 streams, Ok.ru multi-quality MP4s, Dailymotion master HLS `.m3u8` playlists, and unpacked P.A.C.K.E.R. sources).

### 3. Integrated Interactive Scalar Docs
Serves an interactive Scalar API reference at `/docs` (using custom champagne theme) driven by an OpenAPI 3.1.0 specification exposed at `/openapi.json`. Browsers visiting the root URL are automatically redirected to the interactive documentation.

### 4. Non-Unified Provider Routing
Direct, unpolluted data arrays per provider at `/v1/:provider/search` and dedicated namespace routes (`/v1/animexin/*`, `/v1/dramaid/*`), avoiding ambiguous multi-source payloads.

## Quickstart

```bash
# Install dependencies
npm install

# Run type check
npm run typecheck

# Run automated tests
npm test

# Start local edge development server
npm run dev

# Deploy to Cloudflare Workers
npm run deploy
```

## API Endpoints

### Documentation & System

| Method | Endpoint | Description |
| :----- | :------- | :---------- |
| `GET`  | `/`      | API root (redirects HTML browsers to `/docs`) |
| `GET`  | `/docs`  | Interactive Scalar API documentation |
| `GET`  | `/reference` | Documentation alias |
| `GET`  | `/openapi.json` | Raw OpenAPI 3.1.0 specification |
| `GET`  | `/v1/health` | Service health status and active providers |

### Animexin (`/v1/animexin`)

| Method | Endpoint | Description |
| :----- | :------- | :---------- |
| `GET`  | `/v1/animexin/latest?page=:page` | Paginated latest released episodes |
| `GET`  | `/v1/animexin/popular?page=:page` | Popular / trending anime series |
| `GET`  | `/v1/animexin/search?q=:query&page=:page` | Search anime by keyword |
| `GET`  | `/v1/animexin/detail/:slug` | Series synopsis, genres, and all episode links |
| `GET`  | `/v1/animexin/episode/:slug?extract=true` | Streaming servers, extracted streams, and downloads |
| `GET`  | `/v1/animexin/schedule` | Weekly release schedule |
| `GET`  | `/v1/animexin/genres` | Available genre categories |
| `GET`  | `/v1/animexin/genre/:slug?page=:page` | Browse series by genre |

### Nimegami (`/v1/nimegami`)

| Method | Endpoint | Description |
| :----- | :------- | :---------- |
| `GET`  | `/v1/nimegami/latest?page=:page` | Paginated latest released anime episodes |
| `GET`  | `/v1/nimegami/popular?page=:page` | Popular / trending anime series |
| `GET`  | `/v1/nimegami/search?q=:query&page=:page` | Search anime by keyword |
| `GET`  | `/v1/nimegami/detail/:slug` | Anime synopsis, info, genres, and all episode links |
| `GET`  | `/v1/nimegami/episode/:animeSlug/:episodeSlug` | Direct BerkasDrive MP4 stream, player, and multi-quality downloads |
| `GET`  | `/v1/nimegami/genres` | Available anime genres |
| `GET`  | `/v1/nimegami/genre/:slug?page=:page` | Browse anime by genre |
| `GET`  | `/v1/nimegami/batch/:slug` | Multi-quality batch download mirrors |

### DramaID (`/v1/dramaid`)

| Method | Endpoint | Description |
| :----- | :------- | :---------- |
| `GET`  | `/v1/dramaid/latest?page=:page` | Paginated latest released drama episodes & series |
| `GET`  | `/v1/dramaid/popular?page=:page` | Popular / trending Asian dramas |
| `GET`  | `/v1/dramaid/search?q=:query&page=:page` | Search Asian dramas by keyword |
| `GET`  | `/v1/dramaid/detail/:slug` | Series synopsis, cast, genres, country, and episode links |
| `GET`  | `/v1/dramaid/episode/:dramaSlug/:episodeSlug` | Direct MP4 streams, proxies, multi-quality downloads |
| `GET`  | `/v1/dramaid/genres` | Available drama genres |
| `GET`  | `/v1/dramaid/genre/:slug?page=:page` | Browse dramas by genre |
| `GET`  | `/v1/dramaid/countries` | Available country categories (Korea, China, Japan, etc.) |
| `GET`  | `/v1/dramaid/country/:slug?page=:page` | Browse dramas by country |

### Stream Extraction & Proxy

| Method | Endpoint | Description |
| :----- | :------- | :---------- |
| `GET`  | `/v1/extract?url=:videoEmbedUrl` | Extract playable direct media streams |
| `GET`  | `/v1/stream/proxy?url=:mediaUrl&referer=:referer` | CORS-friendly media streaming proxy |

## Scripts

| Command             | Description                                     |
| :------------------ | :---------------------------------------------- |
| `npm run dev`       | Start local development server with Wrangler    |
| `npm run deploy`    | Deploy Worker to Cloudflare Workers edge        |
| `npm test`          | Run Node.js test suite                          |
| `npm run typecheck` | Run TypeScript `tsc --noEmit` validation        |

## License

[ISC](LICENSE) © 2026 DeltaxApi
