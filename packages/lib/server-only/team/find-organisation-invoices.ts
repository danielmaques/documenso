import { getInvoices } from '@documenso/ee/server-only/billing/get-invoices';
import { TEAM_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/teams';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

export interface FindTeamInvoicesOptions {
  userId: number;
  teamId: number;
}

export const findOrganisationInvoices = async ({ userId, teamId }: FindTeamInvoicesOptions) => {
  const team = await prisma.team.findUniqueOrThrow({
    where: {
      id: teamId,
      members: {
        some: {
          userId,
          role: {
            in: TEAM_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_TEAM'],
          },
        },
      },
    },
  });

  if (!team.customerId) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Team has no customer ID.',
    });
  }

  const results = await getInvoices({ customerId: team.customerId });

  if (!results) {
    return null;
  }

  return {
    data: results.map((invoice) => ({
      invoicePdf: invoice.receipt_url,
      hostedInvoicePdf: invoice.invoice_url,
      status: invoice.status,
      subtotal: Number(invoice.details?.totals?.grand_total ?? 0),
      total: Number(invoice.details?.totals?.grand_total ?? 0),
      amountPaid: Number(invoice.details?.totals?.grand_total ?? 0),
      amountDue: 0,
      created: invoice.created_at ? new Date(invoice.created_at).valueOf() / 1000 : 0,
      paid: invoice.status === 'completed',
      quantity: 1,
      currency: invoice.details?.totals?.currency_code?.toLowerCase() ?? 'usd',
    })),
  };
};
