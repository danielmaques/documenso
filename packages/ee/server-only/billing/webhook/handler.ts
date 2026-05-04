import { SubscriptionStatus } from '@prisma/client';

import { IS_BILLING_ENABLED } from '@documenso/lib/constants/app';
import { verifyPaddleWebhookSignature } from '@documenso/lib/server-only/paddle';

import {
  type PaddleWebhookPayload,
  markSubscriptionAsInactive,
  upsertOrganisationSubscriptionFromWebhook,
} from './shared';

type PaddleWebhookResponse = {
  success: boolean;
  message: string;
};

export const paddleWebhookHandler = async (req: Request): Promise<Response> => {
  try {
    if (!IS_BILLING_ENABLED()) {
      return Response.json(
        {
          success: false,
          message: 'Billing is disabled',
        } satisfies PaddleWebhookResponse,
        { status: 500 },
      );
    }

    const signatureHeader = req.headers.get('paddle-signature') ?? '';
    const payload = await req.text();

    if (!signatureHeader || !payload) {
      return Response.json(
        {
          success: false,
          message: 'Missing signature or payload',
        } satisfies PaddleWebhookResponse,
        { status: 400 },
      );
    }

    const validSignature = verifyPaddleWebhookSignature(payload, signatureHeader);

    if (!validSignature) {
      return Response.json(
        {
          success: false,
          message: 'Invalid webhook signature',
        } satisfies PaddleWebhookResponse,
        { status: 401 },
      );
    }

    const event = JSON.parse(payload) as PaddleWebhookPayload;
    const eventType = event.event_type ?? '';

    if (
      eventType === 'subscription.created' ||
      eventType === 'subscription.updated' ||
      eventType === 'transaction.completed'
    ) {
      await upsertOrganisationSubscriptionFromWebhook({
        data: event.data,
      });
    }

    if (eventType === 'subscription.paused' || eventType === 'subscription.past_due') {
      await upsertOrganisationSubscriptionFromWebhook({
        data: event.data,
        statusOverride: SubscriptionStatus.PAST_DUE,
      });
    }

    if (
      eventType === 'subscription.canceled' ||
      eventType === 'subscription.cancelled' ||
      eventType === 'subscription.terminated'
    ) {
      await markSubscriptionAsInactive(event.data);
    }

    return Response.json(
      {
        success: true,
        message: 'Webhook received',
      } satisfies PaddleWebhookResponse,
      { status: 200 },
    );
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        success: false,
        message: 'Unknown error',
      } satisfies PaddleWebhookResponse,
      { status: 500 },
    );
  }
};
