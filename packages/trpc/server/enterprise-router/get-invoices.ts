import { getInvoices } from '@documenso/ee/server-only/billing/get-invoices';
import { IS_BILLING_ENABLED } from '@documenso/lib/constants/app';
import { ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/organisations';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';

import { authenticatedProcedure } from '../trpc';
import { ZGetInvoicesRequestSchema } from './get-invoices.types';

export const getInvoicesRoute = authenticatedProcedure
  .input(ZGetInvoicesRequestSchema)
  .query(async ({ ctx, input }) => {
    const { organisationId } = input;

    ctx.logger.info({
      input: {
        organisationId,
      },
    });

    const userId = ctx.user.id;

    if (!IS_BILLING_ENABLED()) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'Billing is not enabled',
      });
    }

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
      throw new AppError(AppErrorCode.UNAUTHORIZED, {
        message: 'You are not authorized to access this organisation',
      });
    }

    if (!organisation.customerId) {
      return null;
    }

    const invoices = await getInvoices({
      customerId: organisation.customerId,
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      status: invoice.status ?? 'unknown',
      created: invoice.created_at ? Math.floor(new Date(invoice.created_at).valueOf() / 1000) : 0,
      currency: invoice.details?.totals?.currency_code?.toLowerCase() ?? 'usd',
      total: Number(invoice.details?.totals?.grand_total ?? 0),
      hosted_invoice_url: invoice.invoice_url,
      invoice_pdf: invoice.receipt_url,
    }));
  });
