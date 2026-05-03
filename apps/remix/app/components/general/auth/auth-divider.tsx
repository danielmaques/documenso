import type { ReactNode } from 'react';

import { Trans } from '@lingui/react/macro';

import { cn } from '@documenso/ui/lib/utils';

export type AuthDividerProps = {
  label?: ReactNode;
  className?: string;
};

export const AuthDivider = ({ label, className }: AuthDividerProps) => {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center gap-x-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80',
        className,
      )}
    >
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border/0" />
      <span className="bg-transparent">{label ?? <Trans>Or continue with</Trans>}</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border/0" />
    </div>
  );
};
