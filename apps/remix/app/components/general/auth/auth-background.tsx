import { cn } from '@documenso/ui/lib/utils';

export type AuthBackgroundProps = {
  className?: string;
};

export const AuthBackground = ({ className }: AuthBackgroundProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
    >
      <div className="absolute -left-24 top-[-10%] h-[28rem] w-[28rem] animate-blob rounded-full bg-documenso-300/40 opacity-70 blur-3xl motion-reduce:animate-none dark:bg-documenso-700/20" />
      <div className="absolute right-[-6rem] top-1/3 h-[26rem] w-[26rem] animate-blob-slow rounded-full bg-sky-300/30 opacity-60 blur-3xl motion-reduce:animate-none dark:bg-sky-700/15" />
      <div className="absolute bottom-[-8rem] left-1/3 h-[30rem] w-[30rem] animate-blob-reverse rounded-full bg-violet-300/25 opacity-60 blur-3xl motion-reduce:animate-none dark:bg-violet-700/15" />

      <div
        className="absolute inset-0 opacity-[0.18] dark:opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
          color: 'rgb(148 163 184)',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};
