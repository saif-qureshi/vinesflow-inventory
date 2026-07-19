"use client";

import { useParams } from "next/navigation";

import { PartyView } from "@/components/parties/PartyView";

export default function VendorViewPage() {
  const { id } = useParams<{ id: string }>();
  return <PartyView role="vendor" id={Number(id)} />;
}
