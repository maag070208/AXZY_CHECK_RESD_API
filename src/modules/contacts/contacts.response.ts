export interface IResidentContactResponse {
  id: string;
  residentId: string;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string;
  canGenerateAccess: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  resident?: {
    id: string;
    phone: string | null;
    email: string | null;
    isOwner: boolean;
    user?: {
      id: string;
      name: string;
      lastName: string | null;
      username: string;
    };
  };
}
