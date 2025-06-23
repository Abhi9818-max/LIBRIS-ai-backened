import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple hash function to get a number from a string
function simpleHash(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

const colorPalette = [
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#6d28d9', // violet-700
  '#16a34a', // green-600
  '#d97706', // amber-600
  '#dc2626', // red-600
];

export function getBookColor(bookId: string): string {
  if (!bookId) {
    return colorPalette[0];
  }
  const hash = simpleHash(bookId);
  return colorPalette[hash % colorPalette.length];
}
