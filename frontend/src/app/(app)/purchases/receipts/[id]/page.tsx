"use client";

import { useParams } from "next/navigation";

import { DocumentView } from "@/components/documents/DocumentView";
import { GOODS_RECEIPT_CONFIG } from "@/lib/documentKinds";

export default function ViewGoodsReceiptPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentView config={GOODS_RECEIPT_CONFIG} id={Number(id)} />;
}
