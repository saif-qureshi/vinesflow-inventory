import type { PartyRole, PaymentDirection } from "@/types";

export interface PaymentKindConfig {
  direction: PaymentDirection;
  apiPath: string;
  basePath: string;
  permission: string;
  partyRole: PartyRole;
  labels: {
    listTitle: string;
    listDescription: string;
    party: string;
  };
}

export const PAYMENT_RECEIVED_CONFIG: PaymentKindConfig = {
  direction: "received",
  apiPath: "payments-received",
  basePath: "/sales/payments-received",
  permission: "payments",
  partyRole: "customer",
  labels: {
    listTitle: "Payments Received",
    listDescription: "Money received from customers",
    party: "Customer",
  },
};

export const PAYMENT_MADE_CONFIG: PaymentKindConfig = {
  direction: "made",
  apiPath: "payments-made",
  basePath: "/purchases/payments-made",
  permission: "payments",
  partyRole: "vendor",
  labels: {
    listTitle: "Payments Made",
    listDescription: "Money paid to vendors",
    party: "Vendor",
  },
};

export const PAYMENT_CONFIG: Record<PaymentDirection, PaymentKindConfig> = {
  received: PAYMENT_RECEIVED_CONFIG,
  made: PAYMENT_MADE_CONFIG,
};
