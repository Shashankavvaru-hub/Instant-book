import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

export const formatCurrency = (amount: string | number) =>
  `₹${Number(amount).toLocaleString("en-IN")}`;

export const statusColor: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PENDING:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  EXPIRED:   "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};
