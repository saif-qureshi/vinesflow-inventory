import type { PaymentStatus } from "@/types";

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; color?: string }> = {
  draft: { label: "Draft" },
  submitted: { label: "Submitted", color: "green" },
  cancelled: { label: "Cancelled", color: "red" },
};

export const PAYMENT_STATUS_OPTIONS = (Object.keys(PAYMENT_STATUS_META) as PaymentStatus[]).map(
  (value) => ({ value, label: PAYMENT_STATUS_META[value].label }),
);

export const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};
