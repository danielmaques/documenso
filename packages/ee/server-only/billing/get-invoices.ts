import { paddleRequest } from '@documenso/lib/server-only/paddle';

import type { PaddleListResponse, PaddleTransaction } from './paddle.types';

export type GetInvoicesOptions = {
  customerId: string;
};

export const getInvoices = async ({ customerId }: GetInvoicesOptions) => {
  const response = await paddleRequest<PaddleListResponse<PaddleTransaction>>(
    `/transactions?customer_id=${customerId}&per_page=100`,
  );

  return response.data;
};
