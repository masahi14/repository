import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDeadlineStatus(deadline: Date | null): "red" | "yellow" | "green" | "none" {
  if (!deadline) return "none";
  const now = new Date();
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "red";
  if (diffDays <= 3) return "yellow";
  return "green";
}

export function getStageDays(assignedAt: Date): number {
  const now = new Date();
  return Math.floor((now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60 * 24));
}
