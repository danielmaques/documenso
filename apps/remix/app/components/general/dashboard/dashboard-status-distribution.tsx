import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@documenso/ui/primitives/card';

type DashboardStatusDistributionItem = {
  id: string;
  label: React.ReactNode;
  value: number;
  percentage: number;
};

type DashboardStatusDistributionProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  items: DashboardStatusDistributionItem[];
  emptyState: React.ReactNode;
};

export const DashboardStatusDistribution = ({
  title,
  description,
  items,
  emptyState,
}: DashboardStatusDistributionProps) => {
  return (
    <Card className="border-border/60 bg-background/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="text-muted-foreground">{item.value.toLocaleString()}</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyState}</p>
        )}
      </CardContent>
    </Card>
  );
};
