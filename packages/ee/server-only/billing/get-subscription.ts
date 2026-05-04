import { ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/organisations';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { paddleRequest } from '@documenso/lib/server-only/paddle';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';

import { getInternalClaimPlans } from './get-internal-claim-plans';
import type { PaddleEntityResponse, PaddleSubscription } from './paddle.types';

export type GetSubscriptionOptions = {
  userId: number;
  organisationId: string;
};

export const getSubscription = async ({ organisationId, userId }: GetSubscriptionOptions) => {
  const organisation = await prisma.organisation.findFirst({
    where: buildOrganisationWhereQuery({
      organisationId,
      userId,
      roles: ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_ORGANISATION'],
    }),
    include: {
      subscription: true,
    },
  });

  if (!organisation) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Organisation not found',
    });
  }

  if (!organisation.subscription) {
    return null;
  }

  const plans = await getInternalClaimPlans();
  const currentPlan =
    Object.values(plans).find(
      (plan) =>
        plan.monthlyPrice?.id === organisation.subscription?.priceId ||
        plan.yearlyPrice?.id === organisation.subscription?.priceId,
    ) ?? null;

  let paddleSubscription: PaddleSubscription | null = null;

  try {
    const response = await paddleRequest<PaddleEntityResponse<PaddleSubscription>>(
      `/subscriptions/${organisation.subscription.planId}`,
    );
    paddleSubscription = response.data;
  } catch (err) {
    console.error('[Billing] Failed to fetch Paddle subscription.', err);
  }

  return {
    organisationSubscription: organisation.subscription,
    currentPlanName: currentPlan?.name ?? null,
    paddleSubscription,
  };
};
