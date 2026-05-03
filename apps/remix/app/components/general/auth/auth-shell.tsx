import type { ReactNode } from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@documenso/ui/lib/utils';

export type AuthShellProps = {
  title: ReactNode;
  description?: ReactNode;
  headerSlot?: ReactNode;
  children: ReactNode;
  footerSlot?: ReactNode;
  className?: string;
  size?: 'default' | 'wide';
};

export const AuthShell = ({
  title,
  description,
  headerSlot,
  children,
  footerSlot,
  className,
  size = 'default',
}: AuthShellProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative z-10 mx-auto w-full',
        size === 'wide' ? 'max-w-xl' : 'max-w-md',
        className,
      )}
    >
      <div className="rounded-2xl border border-neutral-200/70 bg-white/70 p-7 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-9 dark:border-neutral-800/70 dark:bg-neutral-950/70 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.45)]">
        {headerSlot && <div className="mb-5">{headerSlot}</div>}

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.7rem]">
            {title}
          </h1>

          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="mt-7">{children}</div>
      </div>

      {footerSlot && <div className="mt-6 text-center">{footerSlot}</div>}
    </motion.div>
  );
};
