export type PaymentDirection = "received" | "made";
export type PaymentStatus = "draft" | "submitted" | "cancelled";
export type PaymentMethod = "cash" | "bank" | "cheque" | "card" | "other";

export interface PaymentParty {
  id: number;
  name: string;
  email: string | null;
}

export interface PaymentAllocation {
  id: number;
  document_id: number;
  document_number: string;
  amount: string;
}

export interface PaymentRecord {
  id: number;
  direction: PaymentDirection;
  number: string;
  status: PaymentStatus;
  party_id: number | null;
  party: PaymentParty | null;
  party_name: string | null;
  document_date: string;
  posting_date: string;
  method: PaymentMethod;
  amount: string;
  allocated_amount: string;
  unapplied_amount: string;
  reference: string | null;
  notes: string | null;
  submitted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  allocations: PaymentAllocation[];
}

export interface PaymentSummary {
  id: number;
  number: string;
  status: PaymentStatus;
  party_name: string | null;
  document_date: string;
  method: PaymentMethod;
  amount: string;
  allocated_amount: string;
  unapplied_amount: string;
}

export interface PaymentAllocationInput {
  document_id: number;
  amount: number;
}

export interface PaymentInput {
  party_id: number;
  document_date?: string | null;
  posting_date?: string | null;
  method?: PaymentMethod;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  allocations: PaymentAllocationInput[];
}

export interface OutstandingDocument {
  id: number;
  number: string;
  type: string;
  issue_date: string;
  due_date: string | null;
  total: string;
  amount_paid: string;
  balance_due: string;
}
