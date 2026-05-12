import { RoundStatus } from "@prisma/client";

export interface IRoundResponse {
  id: string;
  guardId: string;
  startTime: Date;
  endTime: Date | null;
  status: RoundStatus;
  recurringConfigurationId: string | null;
  guard: {
    id: string;
    name: string;
    lastName: string | null;
    username: string;
  };
  recurringConfiguration?: {
    id: string;
    title: string;
  } | null;
}
