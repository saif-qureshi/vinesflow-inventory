"use client";

import { useParams } from "next/navigation";
import { Spin } from "antd";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { useDocument } from "@/hooks/useDocuments";
import { DELIVERY_CHALLAN_CONFIG } from "@/lib/documentKinds";

export default function EditDeliveryChallanPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading } = useDocument(DELIVERY_CHALLAN_CONFIG.apiPath, Number(id));

  if (isLoading || !doc) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  return <DocumentForm config={DELIVERY_CHALLAN_CONFIG} document={doc} />;
}
