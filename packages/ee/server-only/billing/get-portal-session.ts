import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getPaddleEnvironment, paddleRequest } from '@documenso/lib/server-only/paddle';

import type { PaddleEntityResponse } from './paddle.types';

type PaddlePortalSession = {
  url?: string;
};

export type GetPortalSessionOptions = {
  customerId: string;
  returnUrl?: string;
};

const getFallbackPortalUrl = (customerId: string) => {
  const environment = getPaddleEnvironment();
  const baseUrl =
    environment === 'production'
      ? 'https://billing.paddle.com'
      : 'https://sandbox-billing.paddle.com';

  return `${baseUrl}/customers/${customerId}`;
};

export const getPortalSession = async ({ customerId, returnUrl }: GetPortalSessionOptions) => {
  try {
    const response = await paddleRequest<PaddleEntityResponse<PaddlePortalSession>>(
      '/customer-portal-sessions',
      {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          return_url: returnUrl,
        }),
      },
    );

    if (response.data?.url) {
      return response.data.url;
    }
  } catch (err) {
    console.error('[Billing] Failed to create Paddle portal session, using fallback URL.', err);
  }

  const fallbackUrl = getFallbackPortalUrl(customerId);

  if (!fallbackUrl) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'Failed to create Paddle portal session',
    });
  }

  return fallbackUrl;
};
