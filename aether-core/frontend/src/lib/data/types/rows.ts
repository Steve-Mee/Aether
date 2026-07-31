export interface OrderRow {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
}

export interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
}

export interface EmailRow {
  id: string;
  from: string;
  subject: string | null;
  status: string;
  riskLevel: string | null;
  category: string | null;
  confidence: number | null;
  createdAt: string;
}

export interface NegotiationRow {
  id: string;
  status: string;
  currentOffer: number | null;
  productId: string | null;
  updatedAt: string;
}

export interface AutonomousDecisionRow {
  id: string;
  type: string;
  result: string;
  rationale: string | null;
  createdAt: string;
}

/** @deprecated Use OrderRow — kept for demo module compatibility */
export type OrderRowDemo = OrderRow;

/** @deprecated Use ProductRow */
export type ProductRowDemo = ProductRow;

/** @deprecated Use EmailRow */
export type EmailRowDemo = EmailRow;

/** @deprecated Use NegotiationRow */
export type NegotiationRowDemo = NegotiationRow;

/** @deprecated Use AutonomousDecisionRow */
export type AutonomousDecisionRowDemo = AutonomousDecisionRow;
