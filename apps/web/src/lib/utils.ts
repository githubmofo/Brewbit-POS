import { clsx, type ClassValue } from "clsx";

/**
 * Combines multiple CSS class names conditionally.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Formats numeric currency inputs into standard Indian Rupees format (₹0.00).
 */
export function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(num);
}
