import { Hono } from 'hono';
import { sendSuccess } from '../utils/response.ts';

export const healthRoute = new Hono();

const startTime = Date.now();

healthRoute.get('/health', (c) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  return sendSuccess(c, {
    status: 'healthy',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    service: 'DeltaxApi',
    version: '1.0.0',
    providers: ['animexin.dev'],
  });
});
