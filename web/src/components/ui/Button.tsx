import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none',
  {
    variants: {
      variant: {
        primary: 'bg-(--color-primary) text-(--color-primary-foreground) hover:opacity-80',
        secondary: 'bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-border)',
        ghost: 'text-(--color-foreground) hover:bg-(--color-muted)',
        destructive: 'bg-(--color-destructive) text-white hover:opacity-80',
        outline: 'border border-(--color-border) text-(--color-foreground) hover:bg-(--color-muted)',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-12 px-6 text-base rounded-lg',
        icon: 'h-9 w-9 rounded-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);

Button.displayName = 'Button';
export { Button, buttonVariants };
