"use client";

import { useParams } from "next/navigation";

import { PaymentView } from "@/components/payments/PaymentView";
import { PAYMENT_RECEIVED_CONFIG } from "@/lib/paymentKinds";

export default function ViewPaymentReceivedPage() {
  const { id } = useParams<{ id: string }>();
  return <PaymentView config={PAYMENT_RECEIVED_CONFIG} id={Number(id)} />;
}
