import { AccessType } from "@prisma/client";

export interface IAccessCreateRequest {
  residentId: string;
  visitorId: string;
  type: AccessType;
  validFrom: string;
  validUntil: string;
}

export interface IAccessUpdateRequest {
  type?: AccessType;
  validFrom?: string;
  validUntil?: string;
  used?: boolean;
  softDelete?: boolean;
}
