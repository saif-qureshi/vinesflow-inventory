"use client";

import { useParams } from "next/navigation";

import { ComingSoon } from "@/components/ComingSoon";
import { titleFromSlug } from "@/lib/text";

export default function PurchasesPlaceholder() {
  const { slug } = useParams<{ slug: string[] }>();
  const last = Array.isArray(slug) ? slug[slug.length - 1] : (slug ?? "");
  return <ComingSoon title={titleFromSlug(last)} description="Purchases" />;
}
