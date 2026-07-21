import type { InvoiceStatus } from "@/types";

export const STATUS_META: Record<InvoiceStatus, { label: string; color?: string }> = {
  draft: { label: "Draft" },
  sent: { label: "Sent", color: "blue" },
  partially_paid: { label: "Partially Paid", color: "orange" },
  paid: { label: "Paid", color: "green" },
  void: { label: "Void", color: "red" },
};

export const STATUS_OPTIONS = (Object.keys(STATUS_META) as InvoiceStatus[]).map((value) => ({
  value,
  label: STATUS_META[value].label,
}));
