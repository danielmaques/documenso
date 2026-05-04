import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { paddleRequest } from '@documenso/lib/server-only/paddle';

import type { PaddleEntityResponse, PaddleTransaction } from './paddle.types';

export type CreateCheckoutSessionOptions = {
  customerId: string;
  priceId: string;
  returnUrl: string;
  subscriptionMetadata?: Record<string, string>;
};

export const createCheckoutSession = async ({
  customerId,
  priceId,
  returnUrl,
  subscriptionMetadata,
}: CreateCheckoutSessionOptions) => {
  const response = await paddleRequest<PaddleEntityResponse<PaddleTransaction>>('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      customer_id: customerId,
      custom_data: subscriptionMetadata,
      checkout: {
        url: returnUrl,
      },
      collection_mode: 'automatic',
    }),
  });

  const checkoutUrl = response.data?.checkout?.url;

  if (!checkoutUrl) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'Failed to create Paddle checkout session',
    });
  }

  return checkoutUrl;
};
