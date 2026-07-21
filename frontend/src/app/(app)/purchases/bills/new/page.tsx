"use client";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { BILL_CONFIG } from "@/lib/documentKinds";

export default function NewBillPage() {
  return <DocumentForm config={BILL_CONFIG} />;
}
