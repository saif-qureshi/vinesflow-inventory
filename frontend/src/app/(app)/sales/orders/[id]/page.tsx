"use client";

import { useParams } from "next/navigation";

import { DocumentView } from "@/components/documents/DocumentView";
import { SALES_ORDER_CONFIG } from "@/lib/documentKinds";

export default function ViewSalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentView config={SALES_ORDER_CONFIG} id={Number(id)} />;
}
