export interface IResidentContactCreateRequest {
  residentId: string;
  name: string;
  phone?: string;
  email?: string;
  relationship: string;
  canGenerateAccess?: boolean;
  active?: boolean;
}

export interface IResidentContactUpdateRequest {
  residentId?: string;
  name?: string;
  phone?: string;
  email?: string;
  relationship?: string;
  canGenerateAccess?: boolean;
  active?: boolean;
  softDelete?: boolean;
}
