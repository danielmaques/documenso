import { useMemo, useState } from 'react';

import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Link } from 'react-router';

import type { ExtendedDocumentStatus } from '@documenso/prisma/types/extended-document-status';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@documenso/ui/primitives/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@documenso/ui/primitives/select';

import { DocumentStatus } from '~/components/general/document/document-status';

type DashboardRecentActivityItem = {
  id: string | number;
  title: string;
  href: string;
  createdAt: Date;
  status: ExtendedDocumentStatus;
};

type DashboardRecentActivityListProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  items: DashboardRecentActivityItem[];
  emptyTitle: React.ReactNode;
  emptyDescription: React.ReactNode;
};

type DashboardSortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

export const DashboardRecentActivityList = ({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: DashboardRecentActivityListProps) => {
  const { i18n, _ } = useLingui();
  const [sortBy, setSortBy] = useState<DashboardSortOption>('newest');

  const sortedItems = useMemo(() => {
    return [...items].sort((itemA, itemB) => {
      if (sortBy === 'oldest') {
        return itemA.createdAt.getTime() - itemB.createdAt.getTime();
      }

      if (sortBy === 'title-asc') {
        return itemA.title.localeCompare(itemB.title, i18n.locale);
      }

      if (sortBy === 'title-desc') {
        return itemB.title.localeCompare(itemA.title, i18n.locale);
      }

      return itemB.createdAt.getTime() - itemA.createdAt.getTime();
    });
  }, [i18n.locale, items, sortBy]);

  return (
    <Card className="border-border/60 bg-background/80 shadow-sm">
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as DashboardSortOption)}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue placeholder={_(msg`Sort by`)} />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="newest">{_(msg`Newest first`)}</SelectItem>
              <SelectItem value="oldest">{_(msg`Oldest first`)}</SelectItem>
              <SelectItem value="title-asc">{_(msg`Title (A-Z)`)}</SelectItem>
              <SelectItem value="title-desc">{_(msg`Title (Z-A)`)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {sortedItems.length > 0 ? (
          sortedItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="flex items-center justify-between rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {i18n.date(item.createdAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div className="ml-4 shrink-0">
                <DocumentStatus status={item.status} />
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
            <p className="font-medium">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
