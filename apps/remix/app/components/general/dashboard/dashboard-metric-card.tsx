import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import { Badge } from '@documenso/ui/primitives/badge';
import { Card, CardContent } from '@documenso/ui/primitives/card';

type DashboardMetricCardProps = {
  title: ReactNode;
  value: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
  trend?: ReactNode;
};

export const DashboardMetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: DashboardMetricCardProps) => {
  return (
    <Card className="border-border/60 bg-background/90 shadow-sm transition-colors duration-200 hover:border-border hover:bg-background">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>

          <div className="rounded-lg bg-muted p-2 text-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <p className="text-3xl font-semibold tracking-tight">{value}</p>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-none text-muted-foreground">{description}</p>

          {trend ? (
            <Badge variant="neutral" size="small">
              {trend}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
