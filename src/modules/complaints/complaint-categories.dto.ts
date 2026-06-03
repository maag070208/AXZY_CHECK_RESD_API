export interface IComplaintCategoryCreateRequest {
  name: string;
  icon?: string;
  color?: string;
}

export interface IComplaintCategoryUpdateRequest {
  name?: string;
  icon?: string;
  color?: string;
}

export interface IComplaintCategoryResponse {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}
