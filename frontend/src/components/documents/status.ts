import type { DocumentKindConfig } from "@/lib/documentKinds";
import type { DocumentStatus } from "@/types";

const BASE: Record<DocumentStatus, { label: string; color?: string }> = {
  draft: { label: "Draft" },
  sent: { label: "Sent", color: "blue" },
  partially_paid: { label: "Partially Paid", color: "orange" },
  paid: { label: "Paid", color: "green" },
  void: { label: "Void", color: "red" },
};

export function statusMeta(status: DocumentStatus, config?: DocumentKindConfig) {
  const base = BASE[status];
  return {
    label: config?.statusOverrides?.[status] ?? base?.label ?? status,
    color: base?.color,
  };
}

export function statusOptions(config?: DocumentKindConfig) {
  return (Object.keys(BASE) as DocumentStatus[]).map((value) => ({
    value,
    label: statusMeta(value, config).label,
  }));
}
