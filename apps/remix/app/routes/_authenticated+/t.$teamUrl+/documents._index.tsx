import { useEffect, useMemo, useState } from 'react';

import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { EnvelopeType } from '@prisma/client';
import { FolderType, OrganisationType } from '@prisma/client';
import { CheckCheckIcon, Clock3Icon, LayersIcon } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';
import { Link } from 'react-router';
import { z } from 'zod';

import { useSessionStorage } from '@documenso/lib/client-only/hooks/use-session-storage';
import { useCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { STATS_COUNT_CAP } from '@documenso/lib/constants/document';
import { SKIP_QUERY_BATCH_META } from '@documenso/lib/constants/trpc';
import { formatAvatarUrl } from '@documenso/lib/utils/avatars';
import { parseToIntegerArray } from '@documenso/lib/utils/params';
import { formatDocumentsPath } from '@documenso/lib/utils/teams';
import { ExtendedDocumentStatus } from '@documenso/prisma/types/extended-document-status';
import { trpc } from '@documenso/trpc/react';
import type { TFindDocumentsInternalResponse } from '@documenso/trpc/server/document-router/find-documents-internal.types';
import { ZFindDocumentsInternalRequestSchema } from '@documenso/trpc/server/document-router/find-documents-internal.types';
import { Avatar, AvatarFallback, AvatarImage } from '@documenso/ui/primitives/avatar';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import type { RowSelectionState } from '@documenso/ui/primitives/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@documenso/ui/primitives/select';
import { Tabs, TabsList, TabsTrigger } from '@documenso/ui/primitives/tabs';

import { DocumentMoveToFolderDialog } from '~/components/dialogs/document-move-to-folder-dialog';
import { EnvelopesBulkDeleteDialog } from '~/components/dialogs/envelopes-bulk-delete-dialog';
import { EnvelopesBulkMoveDialog } from '~/components/dialogs/envelopes-bulk-move-dialog';
import { DashboardMetricCard } from '~/components/general/dashboard/dashboard-metric-card';
import { DashboardSkeleton } from '~/components/general/dashboard/dashboard-skeleton';
import { DocumentSearch } from '~/components/general/document/document-search';
import { DocumentStatus } from '~/components/general/document/document-status';
import { EnvelopeDropZoneWrapper } from '~/components/general/envelope/envelope-drop-zone-wrapper';
import { FolderGrid } from '~/components/general/folder/folder-grid';
import { PeriodSelector } from '~/components/general/period-selector';
import { DocumentsTable } from '~/components/tables/documents-table';
import { DocumentsTableSenderFilter } from '~/components/tables/documents-table-sender-filter';
import { EnvelopesTableBulkActionBar } from '~/components/tables/envelopes-table-bulk-action-bar';
import { useCurrentTeam } from '~/providers/team';
import { appMetaTags } from '~/utils/meta';

export function meta() {
  return appMetaTags(msg`Documents`);
}

const ZSearchParamsSchema = ZFindDocumentsInternalRequestSchema.pick({
  status: true,
  period: true,
  page: true,
  perPage: true,
  query: true,
}).extend({
  senderIds: z.string().transform(parseToIntegerArray).optional().catch([]),
  sort: z.enum(['newest', 'oldest', 'title-asc', 'title-desc']).optional(),
});

type DashboardSortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

export default function DocumentsPage() {
  const organisation = useCurrentOrganisation();
  const team = useCurrentTeam();

  const { folderId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isMovingDocument, setIsMovingDocument] = useState(false);
  const [documentToMove, setDocumentToMove] = useState<number | null>(null);

  const [rowSelection, setRowSelection] = useSessionStorage<RowSelectionState>(
    'documents-bulk-selection',
    {},
  );
  const [isBulkMoveDialogOpen, setIsBulkMoveDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const selectedEnvelopeIds = useMemo(() => {
    return Object.keys(rowSelection).filter((id) => rowSelection[id]);
  }, [rowSelection]);

  const [stats, setStats] = useState<TFindDocumentsInternalResponse['stats']>({
    [ExtendedDocumentStatus.DRAFT]: 0,
    [ExtendedDocumentStatus.PENDING]: 0,
    [ExtendedDocumentStatus.COMPLETED]: 0,
    [ExtendedDocumentStatus.REJECTED]: 0,
    [ExtendedDocumentStatus.INBOX]: 0,
    [ExtendedDocumentStatus.ALL]: 0,
  });

  const findDocumentSearchParams = useMemo(
    () => ZSearchParamsSchema.safeParse(Object.fromEntries(searchParams.entries())).data || {},
    [searchParams],
  );

  const { data, isLoading, isLoadingError } = trpc.document.findDocumentsInternal.useQuery(
    {
      ...findDocumentSearchParams,
      folderId,
    },
    {
      ...SKIP_QUERY_BATCH_META,
    },
  );

  const getTabHref = (value: keyof typeof ExtendedDocumentStatus) => {
    const params = new URLSearchParams(searchParams);

    params.set('status', value);

    if (value === ExtendedDocumentStatus.ALL) {
      params.delete('status');
    }

    if (value === ExtendedDocumentStatus.INBOX && organisation.type === OrganisationType.PERSONAL) {
      params.delete('status');
    }

    if (params.has('page')) {
      params.delete('page');
    }

    let path = formatDocumentsPath(team.url);

    if (folderId) {
      path += `/f/${folderId}`;
    }

    if (params.toString()) {
      path += `?${params.toString()}`;
    }

    return path;
  };

  useEffect(() => {
    if (data?.stats) {
      setStats(data.stats);
    }
  }, [data?.stats]);

  const currentStatus = findDocumentSearchParams.status || ExtendedDocumentStatus.ALL;
  const currentSort = findDocumentSearchParams.sort || 'newest';
  const documentsPath = formatDocumentsPath(team.url);
  const totalDocuments = stats[ExtendedDocumentStatus.ALL] || 0;

  const sortedDocumentsData = useMemo(() => {
    if (!data?.data) {
      return data;
    }

    const sortedData = [...data.data].sort((documentA, documentB) => {
      if (currentSort === 'oldest') {
        return documentA.createdAt.getTime() - documentB.createdAt.getTime();
      }

      if (currentSort === 'title-asc') {
        return documentA.title.localeCompare(documentB.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      if (currentSort === 'title-desc') {
        return documentB.title.localeCompare(documentA.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return documentB.createdAt.getTime() - documentA.createdAt.getTime();
    });

    return {
      ...data,
      data: sortedData,
    };
  }, [currentSort, data]);

  const handleSortChange = (value: DashboardSortOption) => {
    const params = new URLSearchParams(searchParams);

    if (value === 'newest') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }

    if (params.has('page')) {
      params.delete('page');
    }

    setSearchParams(params, { preventScrollReset: true });
  };

  const isInitialLoading = isLoading && !data;

  return (
    <EnvelopeDropZoneWrapper type={EnvelopeType.DOCUMENT}>
      <div className="relative mx-auto w-full max-w-screen-xl px-4 md:px-8">
        <FolderGrid type={FolderType.DOCUMENT} parentId={folderId ?? null} />

        <div className="mt-8 space-y-6 pb-8 md:space-y-8">
          <Card className="border-border/60 bg-background/90 shadow-sm">
            <CardContent className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:p-7">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar className="h-12 w-12 border border-solid border-border/70 ring-2 ring-muted/50">
                  {team.avatarImageId && <AvatarImage src={formatAvatarUrl(team.avatarImageId)} />}
                  <AvatarFallback className="text-xs text-muted-foreground">
                    {team.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Trans>Documents dashboard</Trans>
                  </p>
                  <h2 className="truncate text-3xl font-semibold tracking-tight">{team.name}</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                    <Trans>
                      Monitor activity, prioritize pending work and manage your pipeline.
                    </Trans>
                  </p>
                </div>
              </div>

              {(folderId || currentStatus !== ExtendedDocumentStatus.PENDING) && (
                <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
                  {folderId && (
                    <Button asChild variant="outline" className="w-full bg-background/60">
                      <Link to={documentsPath}>
                        <LayersIcon className="mr-2 h-4 w-4" />
                        <Trans>Open all documents</Trans>
                      </Link>
                    </Button>
                  )}

                  {currentStatus !== ExtendedDocumentStatus.PENDING && (
                    <Button asChild className="w-full">
                      <Link to={getTabHref(ExtendedDocumentStatus.PENDING)}>
                        <Clock3Icon className="mr-2 h-4 w-4" />
                        <Trans>Review pending</Trans>
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {isInitialLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 xl:gap-4">
                <DashboardMetricCard
                  title={<Trans>Total documents</Trans>}
                  value={totalDocuments.toLocaleString()}
                  description={<Trans>Across all statuses</Trans>}
                  icon={LayersIcon}
                  trend={<DocumentStatus status={currentStatus} />}
                />

                <DashboardMetricCard
                  title={<Trans>Pending</Trans>}
                  value={(stats[ExtendedDocumentStatus.PENDING] || 0).toLocaleString()}
                  description={<Trans>Need your attention</Trans>}
                  icon={Clock3Icon}
                />

                <DashboardMetricCard
                  title={<Trans>Completed</Trans>}
                  value={(stats[ExtendedDocumentStatus.COMPLETED] || 0).toLocaleString()}
                  description={<Trans>Finished documents</Trans>}
                  icon={CheckCheckIcon}
                />
              </div>

              <Card className="border-border/60 bg-background/90 shadow-sm">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Tabs value={currentStatus} className="w-full overflow-x-auto">
                      <TabsList className="inline-flex h-auto min-h-10 w-max min-w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                        {[
                          ExtendedDocumentStatus.INBOX,
                          ExtendedDocumentStatus.PENDING,
                          ExtendedDocumentStatus.COMPLETED,
                          ExtendedDocumentStatus.DRAFT,
                          ExtendedDocumentStatus.ALL,
                        ]
                          .filter((value) => {
                            if (organisation.type === OrganisationType.PERSONAL) {
                              return value !== ExtendedDocumentStatus.INBOX;
                            }

                            return true;
                          })
                          .map((value) => (
                            <TabsTrigger
                              key={value}
                              className="min-w-[84px] hover:text-foreground"
                              value={value}
                              asChild
                            >
                              <Link to={getTabHref(value)} preventScrollReset>
                                <DocumentStatus status={value} />

                                {value !== ExtendedDocumentStatus.ALL && (
                                  <span className="ml-1 inline-block opacity-50">
                                    {stats[value] >= STATS_COUNT_CAP
                                      ? `${STATS_COUNT_CAP.toLocaleString()}+`
                                      : stats[value]}
                                  </span>
                                )}
                              </Link>
                            </TabsTrigger>
                          ))}
                      </TabsList>
                    </Tabs>

                    <div className="grid gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_220px_300px]">
                      <div className="min-w-0">
                        {team && <DocumentsTableSenderFilter teamId={team.id} />}
                      </div>
                      <div className="min-w-0">
                        <PeriodSelector />
                      </div>
                      <div className="min-w-0">
                        <Select
                          value={currentSort}
                          onValueChange={(value) => handleSortChange(value as DashboardSortOption)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={<Trans>Sort by</Trans>} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">
                              <Trans>Newest first</Trans>
                            </SelectItem>
                            <SelectItem value="oldest">
                              <Trans>Oldest first</Trans>
                            </SelectItem>
                            <SelectItem value="title-asc">
                              <Trans>Title (A-Z)</Trans>
                            </SelectItem>
                            <SelectItem value="title-desc">
                              <Trans>Title (Z-A)</Trans>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-0 md:col-span-2 xl:col-span-1">
                        <DocumentSearch initialValue={findDocumentSearchParams.query} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/90 shadow-sm">
                <CardContent className="p-4">
                  <DocumentsTable
                    data={sortedDocumentsData}
                    isLoading={isLoading}
                    isLoadingError={isLoadingError}
                    onMoveDocument={(documentId) => {
                      setDocumentToMove(documentId);
                      setIsMovingDocument(true);
                    }}
                    enableSelection
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {documentToMove && (
            <DocumentMoveToFolderDialog
              documentId={documentToMove}
              open={isMovingDocument}
              currentFolderId={folderId}
              onOpenChange={(open) => {
                setIsMovingDocument(open);

                if (!open) {
                  setDocumentToMove(null);
                }
              }}
            />
          )}

          <EnvelopesTableBulkActionBar
            selectedCount={selectedEnvelopeIds.length}
            onMoveClick={() => setIsBulkMoveDialogOpen(true)}
            onDeleteClick={() => setIsBulkDeleteDialogOpen(true)}
            onClearSelection={() => setRowSelection({})}
          />

          <EnvelopesBulkMoveDialog
            envelopeIds={selectedEnvelopeIds}
            envelopeType={EnvelopeType.DOCUMENT}
            open={isBulkMoveDialogOpen}
            currentFolderId={folderId}
            onOpenChange={setIsBulkMoveDialogOpen}
            onSuccess={() => setRowSelection({})}
          />

          <EnvelopesBulkDeleteDialog
            envelopeIds={selectedEnvelopeIds}
            envelopeType={EnvelopeType.DOCUMENT}
            open={isBulkDeleteDialogOpen}
            onOpenChange={setIsBulkDeleteDialogOpen}
            onSuccess={() => setRowSelection({})}
          />
        </div>
      </div>
    </EnvelopeDropZoneWrapper>
  );
}
