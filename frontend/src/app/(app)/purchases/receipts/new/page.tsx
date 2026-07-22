"use client";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { GOODS_RECEIPT_CONFIG } from "@/lib/documentKinds";

export default function NewGoodsReceiptPage() {
  return <DocumentForm config={GOODS_RECEIPT_CONFIG} />;
}
