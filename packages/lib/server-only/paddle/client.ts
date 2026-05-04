import { createHmac, timingSafeEqual } from 'node:crypto';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { env } from '@documenso/lib/utils/env';

const PADDLE_ENVIRONMENT = env('NEXT_PRIVATE_PADDLE_ENVIRONMENT') ?? 'sandbox';
const PADDLE_API_URL = env('NEXT_PRIVATE_PADDLE_API_URL') ?? 'https://api.paddle.com';
const PADDLE_API_KEY = env('NEXT_PRIVATE_PADDLE_API_KEY') ?? '';
const PADDLE_WEBHOOK_SECRET = env('NEXT_PRIVATE_PADDLE_WEBHOOK_SECRET') ?? '';

const assertPaddleApiKey = () => {
  if (PADDLE_API_KEY) {
    return;
  }

  throw new AppError(AppErrorCode.INVALID_REQUEST, {
    message: 'Missing NEXT_PRIVATE_PADDLE_API_KEY',
  });
};

const getApiUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${PADDLE_API_URL}${path}`;
  }

  return `${PADDLE_API_URL}/${path}`;
};

export const paddleRequest = async <TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> => {
  assertPaddleApiKey();

  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: `Paddle API error (${response.status}): ${errorText}`,
    });
  }

  return (await response.json()) as TResponse;
};

const parsePaddleSignature = (signatureHeader: string) => {
  const entries = signatureHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');

      if (key && value) {
        acc[key] = value;
      }

      return acc;
    }, {});

  return {
    timestamp: entries.ts,
    hash: entries.h1,
  };
};

export const verifyPaddleWebhookSignature = (rawPayload: string, signatureHeader: string) => {
  if (!PADDLE_WEBHOOK_SECRET) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Missing NEXT_PRIVATE_PADDLE_WEBHOOK_SECRET',
    });
  }

  const { timestamp, hash } = parsePaddleSignature(signatureHeader);

  if (!timestamp || !hash) {
    return false;
  }

  const signedPayload = `${timestamp}:${rawPayload}`;
  const expectedHash = createHmac('sha256', PADDLE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expectedHash), Buffer.from(hash));
  } catch {
    return false;
  }
};

export const getPaddleEnvironment = () => PADDLE_ENVIRONMENT;
