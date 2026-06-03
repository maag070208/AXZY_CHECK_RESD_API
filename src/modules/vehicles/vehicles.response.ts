export interface IVehicleResponse {
  id: string;
  houseId: string;
  plate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  house?: {
    id: string;
    number: string;
    street: string;
    block: string | null;
  };
}
