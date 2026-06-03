export interface IHouseCreateRequest {
  number: string;
  street: string;
  block?: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
  occupied?: boolean;
  active?: boolean;
}

export interface IHouseUpdateRequest {
  number?: string;
  street?: string;
  block?: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
  occupied?: boolean;
  active?: boolean;
  softDelete?: boolean;
}
