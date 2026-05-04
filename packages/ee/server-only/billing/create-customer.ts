import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { paddleRequest } from '@documenso/lib/server-only/paddle';

import type { PaddleCustomer, PaddleEntityResponse } from './paddle.types';

export type CreateBillingCustomerOptions = {
  email: string;
  name?: string;
};

export const createCustomer = async ({ email, name }: CreateBillingCustomerOptions) => {
  const response = await paddleRequest<PaddleEntityResponse<PaddleCustomer>>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      email,
      name,
    }),
  });

  if (!response.data?.id) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'Failed to create Paddle customer',
    });
  }

  return response.data;
};
