export interface IVehicleCreateRequest {
  houseId: string;
  plate: string;
  brand?: string;
  model?: string;
  color?: string;
  active?: boolean;
}

export interface IVehicleUpdateRequest {
  houseId?: string;
  plate?: string;
  brand?: string;
  model?: string;
  color?: string;
  active?: boolean;
  softDelete?: boolean;
}
