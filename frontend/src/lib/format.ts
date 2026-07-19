export function formatMoney(n: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCompact(n: number, currency?: string): string {
  return new Intl.NumberFormat("en-US", {
    ...(currency
      ? { style: "currency", currency, currencyDisplay: "narrowSymbol" }
      : {}),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
