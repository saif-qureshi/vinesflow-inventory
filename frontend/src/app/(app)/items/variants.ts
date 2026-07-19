import type { VariantAttribute } from "@/types";

export interface VariantOverride {
  sku?: string;
  sale_price?: number | null;
  purchase_price?: number | null;
}

export function cartesian(attributes: VariantAttribute[]): Record<string, string>[] {
  const valid = attributes.filter((a) => a.name.trim() && a.options.length);
  if (!valid.length) return [];
  return valid.reduce<Record<string, string>[]>(
    (acc, attr) => {
      const next: Record<string, string>[] = [];
      for (const combo of acc) {
        for (const option of attr.options) next.push({ ...combo, [attr.name]: option });
      }
      return next;
    },
    [{}],
  );
}

export function variantSig(options: Record<string, string>): string {
  return Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join("|");
}
