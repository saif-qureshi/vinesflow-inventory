"use client";

import { useParams } from "next/navigation";

import { PaymentView } from "@/components/payments/PaymentView";
import { PAYMENT_MADE_CONFIG } from "@/lib/paymentKinds";

export default function ViewPaymentMadePage() {
  const { id } = useParams<{ id: string }>();
  return <PaymentView config={PAYMENT_MADE_CONFIG} id={Number(id)} />;
}
