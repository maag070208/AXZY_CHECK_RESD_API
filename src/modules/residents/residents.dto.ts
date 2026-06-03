export interface IResidentCreateRequest {
  userId: string;
  houseId: string;
  phone?: string;
  email?: string;
  isOwner?: boolean;
  active?: boolean;
}

export interface IResidentUpdateRequest {
  userId?: string;
  houseId?: string;
  phone?: string;
  email?: string;
  isOwner?: boolean;
  active?: boolean;
  softDelete?: boolean;
}
