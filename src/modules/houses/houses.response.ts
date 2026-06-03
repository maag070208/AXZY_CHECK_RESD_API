export interface IHouseResponse {
  id: string;
  number: string;
  street: string;
  block: string | null;
  reference: string | null;
  occupied: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
