"use client";

import { PaymentList } from "@/components/payments/PaymentList";
import { PAYMENT_RECEIVED_CONFIG } from "@/lib/paymentKinds";

export default function PaymentsReceivedPage() {
  return <PaymentList config={PAYMENT_RECEIVED_CONFIG} />;
}
