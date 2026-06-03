import { AccessType, AccessStatus } from "@prisma/client";

export interface IAccessCreateRequest {
  residentId: string;
  visitorId?: string;
  visitor?: {
    name: string;
    phone?: string;
  };
  type: AccessType;
  validFrom: string;
  validUntil: string;
}

export interface IAccessUpdateRequest {
  type?: AccessType;
  status?: AccessStatus;
  validFrom?: string;
  validUntil?: string;
  used?: boolean;
  softDelete?: boolean;
  rejectionReason?: string | null;
}
