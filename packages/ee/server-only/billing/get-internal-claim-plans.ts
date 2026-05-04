import { clone } from 'remeda';

import { paddleRequest } from '@documenso/lib/server-only/paddle';
import type { InternalClaimPlans } from '@documenso/lib/types/billing';
import {
  INTERNAL_CLAIM_ID,
  type InternalClaim,
  internalClaims,
} from '@documenso/lib/types/subscription';
import { env } from '@documenso/lib/utils/env';

type PaddleListResponse<TData> = {
  data: TData[];
};

type PaddlePrice = {
  id: string;
  status?: string;
  product_id?: string;
  custom_data?: Record<string, string>;
  description?: string;
  billing_cycle?: {
    interval: 'month' | 'year' | string;
  };
  unit_price?: {
    amount: string;
    currency_code: string;
  };
  name?: string;
};

type PaddleProduct = {
  id: string;
  name?: string;
  description?: string;
  custom_data?: Record<string, string>;
};

const toFriendlyPrice = (amount: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  return formatter.format(amount / 100);
};

const getClaimIdFromCustomData = (customData?: Record<string, string>) => {
  const claimId = customData?.claimId;

  if (!claimId) {
    return null;
  }

  if (!Object.values(INTERNAL_CLAIM_ID).includes(claimId as INTERNAL_CLAIM_ID)) {
    return null;
  }

  return claimId as INTERNAL_CLAIM_ID;
};

const mapPriceToClaimPlan = ({
  plans,
  price,
  product,
}: {
  plans: InternalClaimPlans;
  price: PaddlePrice;
  product: PaddleProduct | undefined;
}) => {
  const claimId =
    getClaimIdFromCustomData(price.custom_data) ?? getClaimIdFromCustomData(product?.custom_data);

  if (!claimId) {
    return;
  }

  const interval: 'month' | 'year' = price.billing_cycle?.interval === 'year' ? 'year' : 'month';
  const currency = price.unit_price?.currency_code?.toUpperCase() ?? 'USD';
  const rawAmount = Number(price.unit_price?.amount ?? 0);
  const amount = Number.isFinite(rawAmount) ? rawAmount : 0;
  const isVisibleInApp = price.custom_data?.visibleInApp !== 'false';
  const productName = product?.name ?? plans[claimId].name;
  const productDescription = product?.description ?? '';
  const isSeatBased =
    price.custom_data?.isSeatBased === 'true' || product?.custom_data?.isSeatBased === 'true';

  const mappedPrice = {
    id: price.id,
    interval,
    amount,
    currency,
    isVisibleInApp,
    friendlyPrice: toFriendlyPrice(amount, currency),
    product: {
      id: product?.id ?? price.product_id ?? price.id,
      name: productName,
      description: productDescription,
      isSeatBased,
      features: [],
    },
  };

  if (interval === 'month') {
    plans[claimId].monthlyPrice = mappedPrice;
    return;
  }

  plans[claimId].yearlyPrice = mappedPrice;
};

const getFallbackPlan = (
  claim: InternalClaim,
  interval: 'month' | 'year',
  priceId?: string,
): InternalClaimPlans[INTERNAL_CLAIM_ID]['monthlyPrice'] | undefined => {
  if (!priceId) {
    return undefined;
  }

  const amount = 0;
  const currency = 'USD';

  return {
    id: priceId,
    interval,
    amount,
    currency,
    isVisibleInApp: true,
    friendlyPrice: toFriendlyPrice(amount, currency),
    product: {
      id: claim.id,
      name: claim.name,
      description: '',
      isSeatBased: claim.id !== INTERNAL_CLAIM_ID.INDIVIDUAL && claim.id !== INTERNAL_CLAIM_ID.FREE,
      features: [],
    },
  };
};

const addFallbackPlansFromEnv = (plans: InternalClaimPlans) => {
  const claimMap: Record<
    INTERNAL_CLAIM_ID,
    {
      monthlyEnv: string;
      yearlyEnv: string;
    }
  > = {
    [INTERNAL_CLAIM_ID.FREE]: {
      monthlyEnv: '',
      yearlyEnv: '',
    },
    [INTERNAL_CLAIM_ID.INDIVIDUAL]: {
      monthlyEnv: env('NEXT_PRIVATE_PADDLE_PRICE_ID_INDIVIDUAL_MONTHLY') ?? '',
      yearlyEnv: env('NEXT_PRIVATE_PADDLE_PRICE_ID_INDIVIDUAL_YEARLY') ?? '',
    },
    [INTERNAL_CLAIM_ID.TEAM]: {
      monthlyEnv: env('NEXT_PRIVATE_PADDLE_PRICE_ID_TEAM_MONTHLY') ?? '',
      yearlyEnv: env('NEXT_PRIVATE_PADDLE_PRICE_ID_TEAM_YEARLY') ?? '',
    },
    [INTERNAL_CLAIM_ID.PLATFORM]: {
      monthlyEnv: env('NEXT_PRIVATE_PADDLE_PRICE_ID_PLATFORM_MONTHLY') ?? '',
      yearlyEnv: env('NEXT_PRIVATE_PADDLE_PRICE_ID_PLATFORM_YEARLY') ?? '',
    },
    [INTERNAL_CLAIM_ID.ENTERPRISE]: {
      monthlyEnv: env('NEXT_PRIVATE_PADDLE_PRICE_ID_ENTERPRISE_MONTHLY') ?? '',
      yearlyEnv: env('NEXT_PRIVATE_PADDLE_PRICE_ID_ENTERPRISE_YEARLY') ?? '',
    },
    [INTERNAL_CLAIM_ID.EARLY_ADOPTER]: {
      monthlyEnv: '',
      yearlyEnv: '',
    },
  };

  for (const [claimId, map] of Object.entries(claimMap) as [
    INTERNAL_CLAIM_ID,
    { monthlyEnv: string; yearlyEnv: string },
  ][]) {
    if (!plans[claimId].monthlyPrice) {
      plans[claimId].monthlyPrice = getFallbackPlan(plans[claimId], 'month', map.monthlyEnv);
    }

    if (!plans[claimId].yearlyPrice) {
      plans[claimId].yearlyPrice = getFallbackPlan(plans[claimId], 'year', map.yearlyEnv);
    }
  }
};

export const getInternalClaimPlans = async (): Promise<InternalClaimPlans> => {
  const plans: InternalClaimPlans = clone(internalClaims);

  try {
    const [pricesResponse, productsResponse] = await Promise.all([
      paddleRequest<PaddleListResponse<PaddlePrice>>('/prices?status=active&per_page=200'),
      paddleRequest<PaddleListResponse<PaddleProduct>>('/products?status=active&per_page=200'),
    ]);

    const productsById = new Map(productsResponse.data.map((product) => [product.id, product]));

    pricesResponse.data.forEach((price) => {
      const product = price.product_id ? productsById.get(price.product_id) : undefined;

      mapPriceToClaimPlan({
        plans,
        price,
        product,
      });
    });
  } catch (err) {
    console.error('[Billing] Failed to sync plans from Paddle API, using env fallback.', err);
  }

  addFallbackPlansFromEnv(plans);

  return plans;
};
