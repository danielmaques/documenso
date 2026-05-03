import { Card, CardContent } from '@documenso/ui/primitives/card';
import { Skeleton } from '@documenso/ui/primitives/skeleton';

type DashboardSkeletonProps = {
  metrics?: number;
};

export const DashboardSkeleton = ({ metrics = 4 }: DashboardSkeletonProps) => {
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-background/80 shadow-sm">
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: metrics }).map((_, index) => (
          <Card key={index} className="border-border/60 bg-background/80 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
