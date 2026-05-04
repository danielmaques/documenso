import { INTERNAL_CLAIM_ID } from '@documenso/lib/types/subscription';

import { getInternalClaimPlans } from './get-internal-claim-plans';

export const getClaimByPriceId = async (priceId: string) => {
  const plans = await getInternalClaimPlans();

  for (const claimId of Object.values(INTERNAL_CLAIM_ID)) {
    const plan = plans[claimId];

    if (plan.monthlyPrice?.id === priceId || plan.yearlyPrice?.id === priceId) {
      return claimId;
    }
  }

  return null;
};
