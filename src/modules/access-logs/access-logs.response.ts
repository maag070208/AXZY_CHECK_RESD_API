export interface IAccessLogResponse {
  id: string;
  accessId: string;
  guardId: string;
  entryTime: Date;
  exitTime: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  access?: {
    id: string;
    type: string;
    qrCode: string | null;
    validFrom: Date;
    validUntil: Date;
  };
  guard?: {
    id: string;
    name: string;
    lastName: string | null;
    username: string;
  };
}
