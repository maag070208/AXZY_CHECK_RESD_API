export interface IAccessResponse {
  id: string;
  residentId: string;
  visitorId: string;
  type: string;
  qrCode: string | null;
  validFrom: Date;
  validUntil: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  resident?: {
    id: string;
    phone: string | null;
    email: string | null;
    user: { id: string; name: string; lastName: string | null };
  };
  visitor?: {
    id: string;
    name: string;
    phone: string | null;
  };
}
