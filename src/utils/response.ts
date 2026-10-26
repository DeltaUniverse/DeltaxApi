import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { WATERMARK } from '../types.ts';

export interface MetaPagination {
  page?: number;
  hasNextPage?: boolean;
  totalResults?: number;
  provider?: string;
  query?: string;
  [key: string]: unknown;
}

/**
 * Ensures watermark (powered_by and support_chat) is inserted as the last properties in the resulting JSON.
 */
export function buildResponse<T>(data: T, meta?: MetaPagination) {
  const result: Record<string, unknown> = {
    status: 'success',
    statusCode: 200,
  };

  if (meta) {
    result.meta = meta;
  }

  result.data = data;
  result.powered_by = WATERMARK.powered_by;
  result.support_chat = WATERMARK.support_chat;

  return result;
}

export function buildErrorResponse(
  message: string,
  statusCode = 400,
  errors?: unknown
) {
  const result: Record<string, unknown> = {
    status: 'error',
    statusCode,
    message,
  };

  if (errors !== undefined) {
    result.errors = errors;
  }

  result.powered_by = WATERMARK.powered_by;
  result.support_chat = WATERMARK.support_chat;

  return result;
}

export function sendSuccess<T>(
  c: Context,
  data: T,
  meta?: MetaPagination,
  statusCode: ContentfulStatusCode = 200
) {
  return c.json(buildResponse(data, meta), statusCode);
}

export function sendError(
  c: Context,
  message: string,
  statusCode: ContentfulStatusCode = 400,
  errors?: unknown
) {
  return c.json(buildErrorResponse(message, statusCode, errors), statusCode);
}
