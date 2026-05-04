import type { OrganisationClaim, Subscription } from '@prisma/client';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { paddleRequest } from '@documenso/lib/server-only/paddle';
import { appLog } from '@documenso/lib/utils/debugger';
import { prisma } from '@documenso/prisma';

import { isPriceSeatsBased } from './is-price-seats-based';

type PaddleSubscriptionItem = {
  price_id?: string;
  quantity?: number;
};

type PaddleSubscriptionResponse = {
  data: {
    id: string;
    items?: PaddleSubscriptionItem[];
  };
};

export type UpdateSubscriptionItemQuantityOptions = {
  subscriptionId: string;
  quantity: number;
  priceId: string;
};

export const updateSubscriptionItemQuantity = async ({
  subscriptionId,
  quantity,
  priceId,
}: UpdateSubscriptionItemQuantityOptions) => {
  const response = await paddleRequest<PaddleSubscriptionResponse>(
    `/subscriptions/${subscriptionId}`,
  );
  const existingItems = response.data.items ?? [];

  const targetItem = existingItems.find((item) => item.price_id === priceId);

  if (!targetItem) {
    throw new Error('Subscription does not contain required item');
  }

  if (targetItem.quantity === quantity) {
    return;
  }

  const items = existingItems.map((item) => ({
    price_id: item.price_id,
    quantity: item.price_id === priceId ? quantity : (item.quantity ?? 1),
  }));

  await paddleRequest(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      items,
      proration_billing_mode: 'prorated_immediately',
    }),
  });
};

/**
 * Asserts that a proposed member count does not exceed the organisation's cap.
 *
 * Only enforced for non-seats-based plans, since seats-based plans meter usage
 * via the billing provider rather than enforcing a hard cap. A `memberCount` of `0`
 * on the organisation claim represents unlimited seats.
 */
export const assertMemberCountWithinCap = async (
  subscription: Subscription,
  organisationClaim: OrganisationClaim,
  quantity: number,
) => {
  const maximumMemberCount = organisationClaim.memberCount;

  if (maximumMemberCount === 0) {
    return;
  }

  const seatsBased = await isPriceSeatsBased(subscription.priceId);

  if (seatsBased) {
    return;
  }

  if (quantity > maximumMemberCount) {
    throw new AppError(AppErrorCode.LIMIT_EXCEEDED, {
      message: 'Maximum member count reached',
    });
  }
};

/**
 * Syncs the organisation's member count with the billing subscription quantity.
 */
export const syncMemberCountWithBillingSeatPlan = async (
  subscription: Subscription,
  organisationClaim: OrganisationClaim,
  quantity: number,
) => {
  if (organisationClaim.memberCount === 0) {
    return;
  }

  const seatsBased = await isPriceSeatsBased(subscription.priceId);

  if (!seatsBased) {
    return;
  }

  appLog('BILLING', 'Updating seat based plan');

  await updateSubscriptionItemQuantity({
    priceId: subscription.priceId,
    subscriptionId: subscription.planId,
    quantity,
  });

  await prisma.organisationClaim.update({
    where: {
      id: organisationClaim.id,
    },
    data: {
      memberCount: quantity,
    },
  });
};
