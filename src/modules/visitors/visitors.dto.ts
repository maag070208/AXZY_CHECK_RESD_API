export interface IVisitorCreateRequest {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface IVisitorUpdateRequest {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  softDelete?: boolean;
}
