import type { PartyRole } from "@/types";

export const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Miss", "Dr."];

export const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR", "INR"];

export const PAYMENT_TERMS = [
  { label: "Due on Receipt", value: 0 },
  { label: "Net 7", value: 7 },
  { label: "Net 15", value: 15 },
  { label: "Net 30", value: 30 },
  { label: "Net 45", value: 45 },
  { label: "Net 60", value: 60 },
];

export function roleLabel(role: PartyRole): string {
  return role === "customer" ? "Customer" : "Vendor";
}

export function otherRole(role: PartyRole): PartyRole {
  return role === "customer" ? "vendor" : "customer";
}

export function basePath(role: PartyRole): string {
  return role === "customer" ? "/sales/customers" : "/purchases/vendors";
}
