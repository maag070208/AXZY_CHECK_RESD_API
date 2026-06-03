export interface IUserResponse {
  id: string;
  name: string;
  lastName: string | null;
  username: string;
  active: boolean;
  isLoggedIn: boolean;
  roleId: string;
  scheduleId: string | null;
  role: {
    id: string;
    name: string;
    value: string;
  };
  schedule?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
  assignmentLogs?: any[];
}
