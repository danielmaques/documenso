import { paddleWebhookHandler } from '@documenso/ee/server-only/billing/webhook/handler';

export async function action({ request }: { request: Request }) {
  return await paddleWebhookHandler(request);
}
