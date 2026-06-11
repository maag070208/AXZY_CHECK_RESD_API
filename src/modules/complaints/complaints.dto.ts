import { ComplaintStatus } from "@prisma/client";

export interface IComplaintCreateRequest {
  residentId: string;
  categoryId: string;
  title: string;
  description: string;
  media?: object;
}

export interface IComplaintUpdateRequest {
  categoryId?: string;
  title?: string;
  description?: string;
  media?: object;
  status?: ComplaintStatus;
  resolvedById?: string;
  resolvedAt?: string;
  softDelete?: boolean;
}

export interface IComplaintResponse {
  id: string;
  residentId: string;
  categoryId: string;
  title: string;
  description: string;
  media: object | null;
  status: string;
  resolvedById: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  resident?: {
    id: string;
    phone: string | null;
    user: { id: string; name: string; lastName: string | null };
  };
  category?: { id: string; name: string; icon: string | null; color: string | null };
  resolvedBy?: { id: string; name: string; lastName: string | null } | null;
}

export interface IComplaintMessageResponse {
  id: string;
  complaintId: string;
  userId: string;
  message: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    lastName: string | null;
  };
}
