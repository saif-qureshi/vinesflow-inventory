"use client";

import { DocumentList } from "@/components/documents/DocumentList";
import { GOODS_RECEIPT_CONFIG } from "@/lib/documentKinds";

export default function GoodsReceiptListPage() {
  return <DocumentList config={GOODS_RECEIPT_CONFIG} />;
}
