"use client";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { SALES_ORDER_CONFIG } from "@/lib/documentKinds";

export default function NewSalesOrderPage() {
  return <DocumentForm config={SALES_ORDER_CONFIG} />;
}
