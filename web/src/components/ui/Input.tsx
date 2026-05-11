import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-(--color-foreground)">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'h-10 w-full rounded-lg border border-(--color-border) bg-(--color-background)',
          'px-3 text-sm text-(--color-foreground) outline-none',
          'placeholder:text-(--color-muted-foreground)',
          'focus:border-(--color-foreground) transition-colors duration-200',
          error && 'border-(--color-destructive)',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-(--color-destructive)">{error}</p>}
    </div>
  )
);

Input.displayName = 'Input';
export { Input };
