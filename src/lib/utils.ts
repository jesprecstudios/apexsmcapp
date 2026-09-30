import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, symbol = "EURUSD"): string {
  if (symbol.includes("JPY")) {
    return price.toFixed(3);
  }
  return price.toFixed(5);
}

export function formatPips(pips: number): string {
  const prefix = pips > 0 ? "+" : "";
  return `${prefix}${pips.toFixed(1)} pips`;
}
