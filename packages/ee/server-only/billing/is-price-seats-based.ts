import { getInternalClaimPlans } from './get-internal-claim-plans';

export const isPriceSeatsBased = async (priceId: string) => {
  const plans = await getInternalClaimPlans();

  return Object.values(plans).some(
    (plan) =>
      (plan.monthlyPrice?.id === priceId || plan.yearlyPrice?.id === priceId) &&
      plan.monthlyPrice?.product.isSeatBased !== false,
  );
};
