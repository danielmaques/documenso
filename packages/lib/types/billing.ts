import { z } from 'zod';

import { ZOrganisationNameSchema } from '@documenso/trpc/server/organisation-router/create-organisation.types';

import type { INTERNAL_CLAIM_ID } from './subscription';
import { type InternalClaim } from './subscription';

export type BillingProvider = 'PADDLE';

export type BillingPlanFeature = {
  name: string;
};

export type BillingPlanProduct = {
  id: string;
  name: string;
  description: string;
  isSeatBased: boolean;
  features: BillingPlanFeature[];
};

export type BillingPlanPrice = {
  id: string;
  isVisibleInApp: boolean;
  friendlyPrice: string;
  product: BillingPlanProduct;
  interval: 'month' | 'year';
  currency: string;
  amount: number;
};

export type InternalClaimPlans = {
  [key in INTERNAL_CLAIM_ID]: InternalClaim & {
    monthlyPrice?: BillingPlanPrice;
    yearlyPrice?: BillingPlanPrice;
  };
};

export const ZBillingOrganisationCreateMetadataSchema = z.object({
  organisationName: ZOrganisationNameSchema,
  userId: z.number(),
});

export type BillingOrganisationCreateMetadata = z.infer<
  typeof ZBillingOrganisationCreateMetadataSchema
>;
