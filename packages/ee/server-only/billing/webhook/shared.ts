import { OrganisationType, SubscriptionStatus } from '@prisma/client';
import { match } from 'ts-pattern';

import {
  createOrganisation,
  createOrganisationClaimUpsertData,
} from '@documenso/lib/server-only/organisation/create-organisation';
import type { BillingOrganisationCreateMetadata } from '@documenso/lib/types/billing';
import { ZBillingOrganisationCreateMetadataSchema } from '@documenso/lib/types/billing';
import { INTERNAL_CLAIM_ID, internalClaims } from '@documenso/lib/types/subscription';
import { prisma } from '@documenso/prisma';

import { getClaimByPriceId } from '../get-claim-by-price-id';

export type PaddleWebhookPayload = {
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    customer_id?: string;
    subscription_id?: string;
    next_billed_at?: string | null;
    scheduled_change?: {
      action?: string;
      effective_at?: string | null;
    } | null;
    items?: Array<{
      price?: {
        id?: string;
      };
    }>;
    custom_data?: Record<string, string>;
  };
};

export const mapPaddleStatusToSubscriptionStatus = (status?: string) =>
  match(status)
    .with('active', () => SubscriptionStatus.ACTIVE)
    .with('trialing', () => SubscriptionStatus.ACTIVE)
    .with('past_due', () => SubscriptionStatus.PAST_DUE)
    .otherwise(() => SubscriptionStatus.INACTIVE);

const parseOrganisationCreateData = (
  unknownCreateData?: string,
): BillingOrganisationCreateMetadata | null => {
  if (!unknownCreateData) {
    return null;
  }

  try {
    const parsed = JSON.parse(unknownCreateData);
    const result = ZBillingOrganisationCreateMetadataSchema.safeParse(parsed);

    if (!result.success) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
};

export const getPriceIdFromWebhookData = (data: PaddleWebhookPayload['data']) =>
  data?.items?.[0]?.price?.id ?? null;

const updateOrganisationClaim = async (organisationId: string, claimId: INTERNAL_CLAIM_ID) => {
  const claim = await prisma.subscriptionClaim.findUnique({
    where: {
      id: claimId,
    },
  });

  if (!claim) {
    return;
  }

  await prisma.organisation.update({
    where: {
      id: organisationId,
    },
    data: {
      organisationClaim: {
        update: {
          originalSubscriptionClaimId: claim.id,
          ...createOrganisationClaimUpsertData(claim),
        },
      },
    },
  });
};

const getOrganisationId = async (
  data: PaddleWebhookPayload['data'],
  claimId: INTERNAL_CLAIM_ID,
) => {
  const customerId = data?.customer_id;

  if (!customerId) {
    throw new Error('Missing customer_id in webhook payload');
  }

  const organisationCreateData = parseOrganisationCreateData(
    data?.custom_data?.organisationCreateData,
  );

  if (organisationCreateData) {
    const createdOrganisation = await createOrganisation({
      name: organisationCreateData.organisationName,
      userId: organisationCreateData.userId,
      type: OrganisationType.ORGANISATION,
      customerId,
      claim: internalClaims[claimId],
    });

    return createdOrganisation.id;
  }

  const organisation = await prisma.organisation.findFirst({
    where: {
      customerId,
    },
  });

  if (!organisation) {
    throw new Error('Organisation not found for customer');
  }

  await updateOrganisationClaim(organisation.id, claimId);

  if (
    claimId !== INTERNAL_CLAIM_ID.INDIVIDUAL &&
    claimId !== INTERNAL_CLAIM_ID.FREE &&
    organisation.type === OrganisationType.PERSONAL
  ) {
    await prisma.organisation.update({
      where: {
        id: organisation.id,
      },
      data: {
        type: OrganisationType.ORGANISATION,
      },
    });
  }

  return organisation.id;
};

export const upsertOrganisationSubscriptionFromWebhook = async ({
  data,
  statusOverride,
}: {
  data: PaddleWebhookPayload['data'];
  statusOverride?: SubscriptionStatus;
}) => {
  const customerId = data?.customer_id;
  const planId = data?.id ?? data?.subscription_id;
  const priceId = getPriceIdFromWebhookData(data);

  if (!customerId || !planId || !priceId) {
    throw new Error('Missing required subscription fields in webhook payload');
  }

  const claimId = await getClaimByPriceId(priceId);

  if (!claimId) {
    throw new Error(`Could not map claim for price ${priceId}`);
  }

  const organisationId = await getOrganisationId(data, claimId);

  const periodEnd = data?.next_billed_at ? new Date(data.next_billed_at) : null;
  const status = statusOverride ?? mapPaddleStatusToSubscriptionStatus(data?.status);
  const cancelAtPeriodEnd = data?.scheduled_change?.action === 'cancel';

  await prisma.subscription.upsert({
    where: {
      organisationId,
    },
    create: {
      organisationId,
      customerId,
      planId,
      priceId,
      status,
      periodEnd,
      cancelAtPeriodEnd,
    },
    update: {
      customerId,
      planId,
      priceId,
      status,
      periodEnd,
      cancelAtPeriodEnd,
    },
  });
};

export const markSubscriptionAsInactive = async (data: PaddleWebhookPayload['data']) => {
  const planId = data?.id ?? data?.subscription_id;

  if (!planId) {
    return;
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      planId,
    },
    include: {
      organisation: {
        include: {
          organisationClaim: true,
        },
      },
    },
  });

  if (!existingSubscription) {
    return;
  }

  const claimId = await getClaimByPriceId(existingSubscription.priceId);

  if (claimId === INTERNAL_CLAIM_ID.INDIVIDUAL) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.delete({
        where: {
          id: existingSubscription.id,
        },
      });

      await tx.organisationClaim.update({
        where: {
          id: existingSubscription.organisation.organisationClaim.id,
        },
        data: {
          originalSubscriptionClaimId: INTERNAL_CLAIM_ID.FREE,
          ...createOrganisationClaimUpsertData(internalClaims[INTERNAL_CLAIM_ID.FREE]),
        },
      });
    });

    return;
  }

  await prisma.subscription.update({
    where: {
      id: existingSubscription.id,
    },
    data: {
      status: SubscriptionStatus.INACTIVE,
    },
  });
};
