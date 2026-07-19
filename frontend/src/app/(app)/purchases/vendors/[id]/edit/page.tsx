"use client";

import { useParams } from "next/navigation";
import { Spin } from "antd";

import { PartyForm } from "@/components/parties/PartyForm";
import { useParty } from "@/hooks/useParties";

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useParty(Number(id));

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return <PartyForm key={data.id} role="vendor" party={data} />;
}
