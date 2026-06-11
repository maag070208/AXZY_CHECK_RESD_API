import Ably from "ably";
import { env } from "@src/core/config/env.config";

let ablyRest: Ably.Rest | null = null;

const getAblyClient = (): Ably.Rest => {
  if (!ablyRest) {
    if (!env.ABLY_KEY) {
      throw new Error("ABLY_KEY no configurada en variables de entorno");
    }
    ablyRest = new Ably.Rest({ key: env.ABLY_KEY });
  }
  return ablyRest;
};

export const publishComplaintMessage = async (
  complaintId: string,
  message: {
    id: string;
    message: string;
    userId: string;
    userName: string;
    createdAt: string;
  }
) => {
  try {
    const client = getAblyClient();
    const channel = client.channels.get(`complaint:${complaintId}`);
    await channel.publish("message", message);
  } catch (err) {
    console.error("Error publicando mensaje en Ably:", err);
  }
};

export const publishComplaintUpdate = async (
  complaintId: string,
  type: "new_message" | "status_change" | "new_complaint"
) => {
  try {
    const client = getAblyClient();
    const channel = client.channels.get("complaint:updates");
    await channel.publish(type, {
      complaintId,
      type,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error publicando actualización en Ably:", err);
  }
};
