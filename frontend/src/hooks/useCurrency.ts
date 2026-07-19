"use client";

import { useMemo } from "react";

import { useSession } from "@/hooks/useSession";
import { formatCompact, formatMoney } from "@/lib/format";

export function useCurrency() {
  const { currentMembership } = useSession();
  const currency = currentMembership?.organization.currency ?? "PKR";

  return useMemo(
    () => ({
      currency,
      money: (n: number) => formatMoney(n, currency),
      compact: (n: number) => formatCompact(n, currency),
    }),
    [currency],
  );
}
