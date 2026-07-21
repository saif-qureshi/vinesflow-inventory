import type { DocumentStatus } from "@/types";
import type { PartyRole } from "@/types";

export type DocumentKind = "invoice" | "bill";

export interface DocumentKindConfig {
  kind: DocumentKind;
  apiPath: string;
  basePath: string;
  permission: string;
  partyRole: PartyRole;
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
}

export const INVOICE_CONFIG: DocumentKindConfig = {
  kind: "invoice",
  apiPath: "invoices",
  basePath: "/sales/invoices",
  permission: "invoices",
  partyRole: "customer",
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
