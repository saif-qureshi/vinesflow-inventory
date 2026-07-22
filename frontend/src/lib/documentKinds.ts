import type { DocumentStatus, PartyRole, PaymentDirection } from "@/types";

export type DocumentKind = "sales_order" | "delivery_challan" | "invoice" | "bill";

export interface DocumentConversion {
  target: "delivery_challan" | "invoice";
  label: string;
}

export interface DocumentKindConfig {
  kind: DocumentKind;
  apiPath: string;
  basePath: string;
  permission: string;
  partyRole: PartyRole;
  paymentDirection: PaymentDirection;
  /** Whether this document carries money owed (invoices/bills) vs. being purely
   *  operational (orders, challans). */
  tracksPayment: boolean;
  priceField: "sale_price" | "purchase_price";
  labels: {
    singular: string;
    listTitle: string;
    listDescription: string;
    party: string;
    dateLabel: string;
    referenceLabel: string;
    referencePlaceholder: string;
    warehouseHint: string;
    newAction: string;
  };
  statusOverrides?: Partial<Record<DocumentStatus, string>>;
  conversions?: DocumentConversion[];
}

export const SALES_ORDER_CONFIG: DocumentKindConfig = {
  kind: "sales_order",
  apiPath: "sales-orders",
  basePath: "/sales/orders",
  permission: "sales_orders",
  partyRole: "customer",
  paymentDirection: "received",
  tracksPayment: false,
  priceField: "sale_price",
  labels: {
    singular: "Sales Order",
    listTitle: "Sales Orders",
    listDescription: "What customers have ordered but not yet been shipped",
    party: "Customer",
    dateLabel: "Order date",
    referenceLabel: "Reference",
    referencePlaceholder: "Customer PO / reference",
    warehouseHint: "Stock will ship from here",
    newAction: "New Sales Order",
  },
  statusOverrides: { sent: "Confirmed" },
  conversions: [
    { target: "delivery_challan", label: "Create Delivery Challan" },
    { target: "invoice", label: "Convert to Invoice" },
  ],
};

export const DELIVERY_CHALLAN_CONFIG: DocumentKindConfig = {
  kind: "delivery_challan",
  apiPath: "delivery-challans",
  basePath: "/sales/challans",
  permission: "delivery_challans",
  partyRole: "customer",
  paymentDirection: "received",
  tracksPayment: false,
  priceField: "sale_price",
  labels: {
    singular: "Delivery Challan",
    listTitle: "Delivery Challans",
    listDescription: "Goods dispatched to customers",
    party: "Customer",
    dateLabel: "Dispatch date",
    referenceLabel: "Reference",
    referencePlaceholder: "Customer PO / reference",
    warehouseHint: "Stock ships from here",
    newAction: "New Delivery Challan",
  },
  statusOverrides: { sent: "Delivered" },
  conversions: [{ target: "invoice", label: "Convert to Invoice" }],
};

export const INVOICE_CONFIG: DocumentKindConfig = {
  kind: "invoice",
  apiPath: "invoices",
  basePath: "/sales/invoices",
  permission: "invoices",
  partyRole: "customer",
  paymentDirection: "received",
  tracksPayment: true,
  priceField: "sale_price",
  labels: {
    singular: "Invoice",
    listTitle: "Invoices",
    listDescription: "Bill your customers and track what they owe",
    party: "Customer",
    dateLabel: "Invoice date",
    referenceLabel: "Reference",
    referencePlaceholder: "Customer PO / reference",
    warehouseHint: "Stock ships from here",
    newAction: "New Invoice",
  },
};

export const BILL_CONFIG: DocumentKindConfig = {
  kind: "bill",
  apiPath: "bills",
  basePath: "/purchases/bills",
  permission: "bills",
  partyRole: "vendor",
  paymentDirection: "made",
  tracksPayment: true,
  priceField: "purchase_price",
  labels: {
    singular: "Bill",
    listTitle: "Bills",
    listDescription: "Record what you owe your vendors",
    party: "Vendor",
    dateLabel: "Bill date",
    referenceLabel: "Vendor invoice #",
    referencePlaceholder: "Vendor's invoice number",
    warehouseHint: "Stock is received into here",
    newAction: "New Bill",
  },
  statusOverrides: { sent: "Open" },
};
