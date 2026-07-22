"use client";

import { PaymentList } from "@/components/payments/PaymentList";
import { PAYMENT_MADE_CONFIG } from "@/lib/paymentKinds";

export default function PaymentsMadePage() {
  return <PaymentList config={PAYMENT_MADE_CONFIG} />;
}
