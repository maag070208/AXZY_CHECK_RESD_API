export interface IFeeCreateRequest {
  name: string;
  description?: string;
  amount: number;
  type?: "ONE_TIME" | "MONTHLY";
  dueDate?: string;
  active?: boolean;
}

export interface IFeeUpdateRequest {
  name?: string;
  description?: string;
  amount?: number;
  dueDate?: string;
  active?: boolean;
  softDelete?: boolean;
}

export interface IPaymentCreateRequest {
  residentId: string;
  feeId: string;
  amount: number;
  reference?: string;
  status?: string;
  paidAt?: string;
  period?: string;
}

export interface IPaymentUpdateRequest {
  status?: string;
  reference?: string;
  paidAt?: string;
  softDelete?: boolean;
  period?: string;
}
