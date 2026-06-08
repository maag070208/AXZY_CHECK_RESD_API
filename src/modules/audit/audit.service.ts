import { prismaClient as prisma } from "@src/core/config/database";
import { logger } from "@src/core/utils/logger";

export interface IAuditCreate {
  userId: string;
  module: string;
  action: string;
  resourceId?: string;
  details?: any;
}

/**
 * Registra una acción en la tabla de auditoría
 */
export const createAuditLog = async (data: IAuditCreate) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        module: data.module,
        action: data.action,
        resourceId: data.resourceId || null,
        details: data.details || {},
      },
    });

    logger.info(`AUDIT_LOG: [${data.module}] ${data.action} | User: ${data.userId} | Resource: ${data.resourceId || 'N/A'}`);
  } catch (error) {
    logger.error("AUDIT_LOG_ERROR: No se pudo registrar la auditoría", error);
  }
};
