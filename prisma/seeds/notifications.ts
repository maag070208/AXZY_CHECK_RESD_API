import { PrismaClient, NotificationType } from "@prisma/client";
import { hackerLog } from "./logger";

export const notificationsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("NOTIF", "Seeding notifications");

  const residentUsers = await prisma.user.findMany({
    where: { role: { name: "RESDN" } },
    take: 10,
  });

  if (residentUsers.length === 0) {
    hackerLog.error("NOTIF", "No resident users found");
    return;
  }

  const templates: { title: string; message: string; type: NotificationType; read: boolean }[] = [
    { title: "Pago recibido",            message: "Tu pago de cuota de mantenimiento ha sido registrado correctamente.",   type: NotificationType.PAYMENT,   read: true  },
    { title: "Pago pendiente",           message: "Tienes un pago pendiente de $500 por cuota de mantenimiento junio.",   type: NotificationType.PAYMENT,   read: false },
    { title: "Acceso autorizado",        message: "Se autorizó el acceso de un visitante a tu domicilio.",                 type: NotificationType.ACCESS,    read: true  },
    { title: "Acceso denegado",          message: "Un intento de acceso fue denegado. Verifica con seguridad.",            type: NotificationType.ACCESS,    read: false },
    { title: "Queja recibida",           message: "Tu queja ha sido registrada y está siendo procesada.",                  type: NotificationType.COMPLAINT, read: true  },
    { title: "Queja resuelta",           message: "La queja que reportaste ha sido resuelta exitosamente.",                type: NotificationType.COMPLAINT, read: false },
    { title: "Aviso general",            message: "Este sábado se realizará mantenimiento de la cisterna de 8am a 12pm.", type: NotificationType.GENERAL,   read: false },
    { title: "Alerta de seguridad",      message: "Se detectó actividad inusual en el acceso norte. Estamos investigando.", type: NotificationType.EMERGENCY, read: false },
    { title: "Recordatorio de cuota",   message: "Tu cuota de seguridad vence el 30 de junio. Evita cargos por mora.",   type: NotificationType.PAYMENT,   read: false },
    { title: "Corte de agua programado",message: "Habrá corte de agua el martes de 10am a 2pm para mantenimiento.",      type: NotificationType.GENERAL,   read: true  },
  ];

  let count = 0;
  for (let i = 0; i < residentUsers.length; i++) {
    const user = residentUsers[i];
    // Each user gets 3-4 notifications
    const numNotifs = (i % 2) + 3;
    for (let n = 0; n < numNotifs; n++) {
      const tpl = templates[(i + n) % templates.length];
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: tpl.title,
          message: tpl.message,
          type: tpl.type,
          read: tpl.read,
        },
      });
      count++;
    }
  }

  hackerLog.success("NOTIF", `${count} notifications created`);
};
