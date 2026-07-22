"use client";

import { DocumentList } from "@/components/documents/DocumentList";
import { SALES_ORDER_CONFIG } from "@/lib/documentKinds";

export default function SalesOrderListPage() {
  return <DocumentList config={SALES_ORDER_CONFIG} />;
}
