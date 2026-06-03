export interface IFeeResponse {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  dueDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IPaymentResponse {
  id: string;
  residentId: string;
  feeId: string;
  amount: number;
  reference: string | null;
  status: string; // PENDING, PAID, CANCELLED, FAILED
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  resident?: {
    id: string;
    phone: string | null;
    user?: {
      id: string;
      name: string;
      lastName: string | null;
    } | null;
  } | null;
  fee?: {
    id: string;
    name: string;
    amount: number;
  } | null;
}
