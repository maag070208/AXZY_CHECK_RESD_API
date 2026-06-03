export interface IAccessLogCreateRequest {
  accessId: string;
  guardId: string;
  entryTime?: string;
  notes?: string;
}

export interface IAccessLogUpdateRequest {
  exitTime?: string;
  notes?: string;
}
