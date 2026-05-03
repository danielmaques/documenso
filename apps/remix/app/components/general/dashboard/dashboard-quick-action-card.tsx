import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent } from '@documenso/ui/primitives/card';

type DashboardQuickActionCardProps = {
  title: ReactNode;
  description: ReactNode;
  href: string;
  cta: ReactNode;
  icon: LucideIcon;
};

export const DashboardQuickActionCard = ({
  title,
  description,
  href,
  cta,
  icon: Icon,
}: DashboardQuickActionCardProps) => {
  return (
    <Card className="border-border/60 bg-background/90 shadow-sm transition-colors duration-200 hover:border-border hover:bg-background">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2 text-foreground">
            <Icon className="h-4 w-4" />
          </div>

          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="w-full justify-start">
          <Link to={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
