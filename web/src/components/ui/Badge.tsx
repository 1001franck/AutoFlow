import { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-(--color-muted) text-(--color-foreground)',
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
        error: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
        running: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
