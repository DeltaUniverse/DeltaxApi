export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'DeltaxApi',
    version: '1.0.0',
    description:
      'High-performance asynchronous Donghua & Anime Scraper API for **Animexin.dev**, direct video stream extractors, and media proxy, deployed on Cloudflare Workers edge runtime.',
    contact: {
      name: 'DeltaX Support',
      url: 'https://t.me/DeltaDiscuss',
    },
    license: {
      name: 'ISC',
    },
  },
  servers: [
    {
      url: 'https://api.deltax.bond',
      description: 'Production Cloudflare Worker Edge',
    },
    {
      url: 'http://localhost:8787',
      description: 'Local Development Server',
    },
  ],
  tags: [
    {
      name: 'System',
      description: 'Health check, service status, and runtime info',
    },
    {
      name: 'Animexin',
      description: 'Anime & Donghua endpoints scraped from animexin.dev',
    },
    {
      name: 'Extractors',
      description: 'Direct playable media stream extractors (HLS, MP4)',
    },
    {
      name: 'Proxy',
      description: 'CORS-friendly media streaming proxy',
    },
  ],
  paths: {
    '/v1/health': {
      get: {
        tags: ['System'],
        summary: 'Service Health Check',
        description: 'Returns the health status, uptime, and active providers.',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health Check Alias',
        description: 'Root alias for /v1/health.',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/latest': {
      get: {
        tags: ['Animexin'],
        summary: 'Get Latest Anime Releases',
        description: 'Fetches paginated latest released episodes and donghua from Animexin.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
              minimum: 1,
            },
          },
        ],
        responses: {
          '200': {
            description: 'List of latest anime releases',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnimeListResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/popular': {
      get: {
        tags: ['Animexin'],
        summary: 'Get Popular Anime',
        description: 'Fetches popular and trending donghua series from Animexin.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
            },
          },
        ],
        responses: {
          '200': {
            description: 'List of popular anime',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnimeListResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/trending': {
      get: {
        tags: ['Animexin'],
        summary: 'Get Trending Anime',
        description: 'Alias for popular anime releases on Animexin.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
            },
          },
        ],
        responses: {
          '200': {
            description: 'List of trending anime',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnimeListResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/search': {
      get: {
        tags: ['Animexin'],
        summary: 'Search Anime on Animexin',
        description: 'Searches donghua and anime on Animexin by keyword.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search query keyword',
            required: true,
            schema: {
              type: 'string',
              minLength: 1,
            },
            example: 'renegade',
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Search results matching query',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnimeListResponse',
                },
              },
            },
          },
          '400': {
            description: 'Missing or empty search query',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/{provider}/search': {
      get: {
        tags: ['Animexin'],
        summary: 'Generic Provider Search',
        description: 'Non-unified search endpoint by provider name (e.g., `animexin`).',
        parameters: [
          {
            name: 'provider',
            in: 'path',
            description: 'Target provider name',
            required: true,
            schema: {
              type: 'string',
              enum: ['animexin'],
            },
            example: 'animexin',
          },
          {
            name: 'q',
            in: 'query',
            description: 'Search query keyword',
            required: true,
            schema: {
              type: 'string',
              minLength: 1,
            },
            example: 'battle',
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnimeListResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid provider or query',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/detail/{slug}': {
      get: {
        tags: ['Animexin'],
        summary: 'Get Anime Details',
        description: 'Fetches comprehensive anime metadata, synopsis, genres, and all episode links.',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            description: 'Anime identifier slug',
            required: true,
            schema: {
              type: 'string',
            },
            example: 'renegade-immortal',
          },
        ],
        responses: {
          '200': {
            description: 'Anime details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnimeDetailResponse',
                },
              },
            },
          },
          '404': {
            description: 'Anime not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/episode/{slug}': {
      get: {
        tags: ['Animexin'],
        summary: 'Get Episode Streams & Downloads',
        description: 'Extracts streaming servers, base64 iframe mirrors, and multi-resolution download links for an episode.',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            description: 'Episode slug or identifier',
            required: true,
            schema: {
              type: 'string',
            },
            example: 'renegade-immortal-episode-163-indonesia-english-sub',
          },
          {
            name: 'extract',
            in: 'query',
            description: 'Automatically extract direct playable streams from servers',
            required: false,
            schema: {
              type: 'boolean',
              default: false,
            },
          },
          {
            name: 'url',
            in: 'query',
            description: 'Full custom episode URL (optional)',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Episode streaming data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/EpisodeDetailResponse',
                },
              },
            },
          },
          '404': {
            description: 'Episode not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/schedule': {
      get: {
        tags: ['Animexin'],
        summary: 'Get Weekly Release Schedule',
        description: 'Returns the weekly donghua release schedule organized by day (Monday to Sunday).',
        responses: {
          '200': {
            description: 'Weekly schedule mapping',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ScheduleResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/genres': {
      get: {
        tags: ['Animexin'],
        summary: 'Get All Genres',
        description: 'Returns the list of all anime genres with their slugs and links.',
        responses: {
          '200': {
            description: 'List of genres',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GenresResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/animexin/genre/{slug}': {
      get: {
        tags: ['Animexin'],
        summary: 'Browse Anime by Genre',
        description: 'Fetches paginated anime titles for a specific genre slug.',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            description: 'Genre slug (e.g. `action`, `adventure`)',
            required: true,
            schema: {
              type: 'string',
            },
            example: 'action',
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Anime items in this genre',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnimeListResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/extract': {
      get: {
        tags: ['Extractors'],
        summary: 'Extract Direct Video Stream',
        description: 'Resolves embedded iframe and player links (Ok.ru direct MP4, Dailymotion HLS, Rumble, VidHide) into direct playable streams.',
        parameters: [
          {
            name: 'url',
            in: 'query',
            description: 'Video embed URL or player page URL',
            required: true,
            schema: {
              type: 'string',
            },
            example: 'https://geo.dailymotion.com/player/xhojl.html?video=k3mKIvWxuG16P9LTkmO',
          },
        ],
        responses: {
          '200': {
            description: 'Extracted media stream sources',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ExtractResponse',
                },
              },
            },
          },
          '400': {
            description: 'Missing url parameter',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/stream/proxy': {
      get: {
        tags: ['Proxy'],
        summary: 'CORS Media Stream Proxy',
        description: 'Proxies video files, HLS manifests, and video segments bypassing CORS restrictions and hotlink referer checks.',
        parameters: [
          {
            name: 'url',
            in: 'query',
            description: 'Full target media stream URL',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'referer',
            in: 'query',
            description: 'Optional custom referer header to send to upstream host',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Media stream content (audio/video or HLS playlist)',
          },
          '206': {
            description: 'Partial content (Range requests supported)',
          },
          '400': {
            description: 'Invalid or missing target URL',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Watermark: {
        type: 'object',
        properties: {
          powered_by: {
            type: 'string',
            example: 'deltax',
          },
          support_chat: {
            type: 'string',
            example: 'https://t.me/DeltaDiscuss',
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'integer', example: 200 },
          data: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'healthy' },
              uptimeSeconds: { type: 'integer', example: 3600 },
              timestamp: { type: 'string', format: 'date-time' },
              service: { type: 'string', example: 'DeltaxApi' },
              version: { type: 'string', example: '1.0.0' },
              providers: {
                type: 'array',
                items: { type: 'string' },
                example: ['animexin.dev'],
              },
            },
          },
          powered_by: { type: 'string', example: 'deltax' },
          support_chat: { type: 'string', example: 'https://t.me/DeltaDiscuss' },
        },
      },
      AnimeItem: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'Renegade Immortal' },
          slug: { type: 'string', example: 'renegade-immortal' },
          url: { type: 'string', example: 'https://animexin.dev/renegade-immortal/' },
          thumbnail: { type: 'string', example: 'https://animexin.dev/wp-content/uploads/2023/09/Renegade-Immortal-Ascendant.jpg' },
          type: { type: 'string', example: 'Donghua' },
          status: { type: 'string', example: 'Ongoing' },
          latestEpisode: { type: 'string', example: 'Episode 164' },
          subType: { type: 'string', example: 'Sub' },
          rating: { type: 'string', example: '9.2' },
          episodeTitle: { type: 'string', example: 'Renegade Immortal Episode 164' },
        },
        required: ['title', 'slug', 'url', 'thumbnail'],
      },
      AnimeListResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'integer', example: 200 },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              hasNextPage: { type: 'boolean', example: true },
              totalResults: { type: 'integer', example: 16 },
              provider: { type: 'string', example: 'animexin.dev' },
            },
          },
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/AnimeItem',
            },
          },
          powered_by: { type: 'string', example: 'deltax' },
          support_chat: { type: 'string', example: 'https://t.me/DeltaDiscuss' },
        },
      },
      AnimeDetailResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'integer', example: 200 },
          data: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'Renegade Immortal' },
              slug: { type: 'string', example: 'renegade-immortal' },
              url: { type: 'string', example: 'https://animexin.dev/renegade-immortal/' },
              thumbnail: { type: 'string' },
              rating: { type: 'string', example: '9.3' },
              synopsis: { type: 'string' },
              genres: {
                type: 'array',
                items: { type: 'string' },
                example: ['Action', 'Adventure', 'Fantasy'],
              },
              metadata: {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
              episodes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    episodeNumber: { type: 'string' },
                    releaseDate: { type: 'string' },
                    slug: { type: 'string' },
                    url: { type: 'string' },
                  },
                },
              },
            },
          },
          powered_by: { type: 'string', example: 'deltax' },
          support_chat: { type: 'string', example: 'https://t.me/DeltaDiscuss' },
        },
      },
      EpisodeDetailResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'integer', example: 200 },
          data: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              slug: { type: 'string' },
              url: { type: 'string' },
              animeSlug: { type: 'string' },
              animeTitle: { type: 'string' },
              defaultStream: { type: 'string', nullable: true },
              servers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    server: { type: 'string' },
                    url: { type: 'string' },
                  },
                },
              },
              downloads: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    quality: { type: 'string' },
                    links: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          host: { type: 'string' },
                          url: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          powered_by: { type: 'string', example: 'deltax' },
          support_chat: { type: 'string', example: 'https://t.me/DeltaDiscuss' },
        },
      },
      ScheduleResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'integer', example: 200 },
          data: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  slug: { type: 'string' },
                  url: { type: 'string' },
                  time: { type: 'string' },
                  episode: { type: 'string' },
                },
              },
            },
          },
          powered_by: { type: 'string', example: 'deltax' },
          support_chat: { type: 'string', example: 'https://t.me/DeltaDiscuss' },
        },
      },
      GenresResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'integer', example: 200 },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Action' },
                slug: { type: 'string', example: 'action' },
                url: { type: 'string' },
              },
            },
          },
          powered_by: { type: 'string', example: 'deltax' },
          support_chat: { type: 'string', example: 'https://t.me/DeltaDiscuss' },
        },
      },
      ExtractResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'integer', example: 200 },
          meta: {
            type: 'object',
            properties: {
              totalResults: { type: 'integer', example: 1 },
              targetUrl: { type: 'string' },
            },
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                server: { type: 'string', example: 'Dailymotion' },
                quality: { type: 'string', example: 'Auto (HLS)' },
                url: { type: 'string' },
                proxyUrl: { type: 'string' },
                type: { type: 'string', example: 'application/x-mpegURL' },
                headers: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                },
              },
            },
          },
          powered_by: { type: 'string', example: 'deltax' },
          support_chat: { type: 'string', example: 'https://t.me/DeltaDiscuss' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          statusCode: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Invalid search parameters' },
          errors: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          powered_by: { type: 'string', example: 'deltax' },
          support_chat: { type: 'string', example: 'https://t.me/DeltaDiscuss' },
        },
      },
    },
  },
};
