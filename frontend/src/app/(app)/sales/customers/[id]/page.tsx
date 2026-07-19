"use client";

import { useParams } from "next/navigation";

import { PartyView } from "@/components/parties/PartyView";

export default function CustomerViewPage() {
  const { id } = useParams<{ id: string }>();
  return <PartyView role="customer" id={Number(id)} />;
}
