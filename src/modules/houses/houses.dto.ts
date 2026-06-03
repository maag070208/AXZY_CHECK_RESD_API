export interface IHouseCreateRequest {
  number: string;
  street: string;
  block?: string;
  reference?: string;
  occupied?: boolean;
  active?: boolean;
}

export interface IHouseUpdateRequest {
  number?: string;
  street?: string;
  block?: string;
  reference?: string;
  occupied?: boolean;
  active?: boolean;
  softDelete?: boolean;
}
