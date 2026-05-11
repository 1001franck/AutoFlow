import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Fusionne les classes Tailwind sans conflits — utilisé dans tous les composants
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
