"use client";

import { useCan } from "@/hooks/useSession";

export function Can({ code, children }: { code: string; children: React.ReactNode }) {
  const can = useCan();
  return can(code) ? <>{children}</> : null;
}
