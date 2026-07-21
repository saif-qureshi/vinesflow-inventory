"use client";

import { useParams } from "next/navigation";

import { DocumentView } from "@/components/documents/DocumentView";
import { BILL_CONFIG } from "@/lib/documentKinds";

export default function ViewBillPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentView config={BILL_CONFIG} id={Number(id)} />;
}
