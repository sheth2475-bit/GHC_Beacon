import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Converts a YYYY-MM-DD string to DD-MM-YYYY for display. Returns "-" for empty/null values. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  const parts = date.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return date;
}
