export interface IResidentResponse {
  id: string;
  userId: string;
  houseId: string;
  phone: string | null;
  email: string | null;
  isOwner: boolean;
  active: boolean;
  softDelete?: boolean; // If applicable, or deleteAt
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  user?: {
    id: string;
    name: string;
    lastName: string | null;
    username: string;
  };
  house?: {
    id: string;
    number: string;
    street: string;
    block: string | null;
    reference: string | null;
    occupied: boolean;
  };
}
