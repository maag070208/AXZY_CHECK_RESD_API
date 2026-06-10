import { prismaClient as prisma } from "../config/database";
import { resend, transporter } from "../config/mail";
import { logger } from "./logger";

export const sendIncidentEmail = async (incident: any, guard: any) => {
  try {
    // 1. Get recipients from SysConfig
    const config = await prisma.sysConfig.findUnique({
      where: { key: "INCIDENT_EMAIL" },
    });

    if (!config || !config.value) {
      logger.warn("No Recipients found for INCIDENT_EMAIL");
      return;
    }

    const recipients = config.value.split("|");

    const subject = `⚠️ Nuevo Incidente Reportado: ${incident.title}`;

    // 2. Prepare Media Links
    let mediaLinks = "<p><em>No hay evidencia adjunta.</em></p>";
    if (
      incident.media &&
      Array.isArray(incident.media) &&
      incident.media.length > 0
    ) {
      mediaLinks = "<ul>";
      incident.media.forEach((m: any) => {
        const url = m.url;
        const type = m.type === "VIDEO" ? "Video" : "Foto";
        mediaLinks += `<li><a href="${url}" target="_blank">${type} - Ver evidencia</a></li>`;
      });
      mediaLinks += "</ul>";
    }

    // 3. Prepare Email Content with improved design
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #d9534f; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Nuevo Incidente Reportado</h2>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Se ha reportado una nueva incidencia en el sistema. A continuación se detallan los datos registrados por el guardia.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; width: 30%; font-weight: bold; color: #555;">Guardia:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${guard.name} ${guard.lastName || ""}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Fecha:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Título:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${incident.title}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Categoría:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">
                <span style="background-color: #fce4ec; color: #c2185b; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${incident.category?.name || "Sin categoría"}
                </span>
              </td>
            </tr>
          </table>

          <div style="margin-bottom: 25px;">
            <h3 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 5px; margin-bottom: 15px;">Descripción</h3>
            <blockquote style="background: #f9f9f9; padding: 15px; border-left: 5px solid #d9534f; margin: 0; font-style: italic; color: #555;">
              ${incident.description || "Sin descripción"}
            </blockquote>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 5px; margin-bottom: 15px;">Evidencias Adjuntas</h3>
            ${mediaLinks}
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
             <a href="${process.env.SYSTEM_URL || "https://axzycheckui-production.up.railway.app/#/home"}" style="background-color: #333; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold;">Ir al Panel de Control</a>
          </div>
        </div>
        
        <div style="background-color: #fcfcfc; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #999; margin: 0;">Este es un mensaje automático del sistema de recorridos y seguridad.</p>
        </div>
      </div>
    `;

    // 4. Send Email
    logger.debug("Sending email using Resend");
    if (resend) {
      const { data, error } = await resend.emails.send({
        from: "AXZY Check <noreply@axzy.dev>",
        to: recipients,
        subject: subject,
        html: htmlContent,
      });
      if (error) {
        logger.error("Resend Error:", error);
      } else {
        logger.info("Resend Success:", data);
      }
    } else {
      await transporter.sendMail({
        from: "aamaro@axzy.dev",
        to: recipients,
        subject: subject,
        html: htmlContent,
      });
    }

    logger.info(`Incident email sent to ${recipients.join(", ")}`);
  } catch (error) {
    logger.error("Error sending incident email:", error);
  }
};

export const sendMaintenanceEmail = async (maintenance: any, guard: any) => {
  try {
    const config = await prisma.sysConfig.findUnique({
      where: { key: "MAINTENANCE_EMAIL" },
    });

    if (!config || !config.value) {
      logger.warn("No Recipients found for MAINTENANCE_EMAIL");
      return;
    }

    const recipients = config.value.split("|");
    const subject = `🔧 Nuevo Reporte de Mantenimiento: ${maintenance.title}`;

    let mediaLinks = "<p><em>No hay evidencia adjunta.</em></p>";
    if (
      maintenance.media &&
      Array.isArray(maintenance.media) &&
      maintenance.media.length > 0
    ) {
      mediaLinks = "<ul>";
      maintenance.media.forEach((m: any) => {
        const url = m.url;
        const type = m.type === "VIDEO" ? "Video" : "Foto";
        mediaLinks += `<li><a href="${url}" target="_blank">${type} - Ver evidencia</a></li>`;
      });
      mediaLinks += "</ul>";
    }

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f0ad4e; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 24px;">🔧 Nuevo Reporte de Mantenimiento</h2>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Se ha reportado un nuevo mantenimiento en el sistema. A continuación se detallan los datos registrados.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; width: 30%; font-weight: bold; color: #555;">Reporta:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${guard.name} ${guard.lastName || ""}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Fecha:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Tipo:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${maintenance.type?.name || maintenance.title}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Categoría:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${maintenance.categoryRel?.name || maintenance.category || "Mantenimiento General"}</td>
            </tr>
          </table>

          <div style="margin-bottom: 25px;">
            <h3 style="color: #f0ad4e; border-bottom: 2px solid #f0ad4e; padding-bottom: 5px; margin-bottom: 15px;">Descripción</h3>
            <blockquote style="background: #f9f9f9; padding: 15px; border-left: 5px solid #f0ad4e; margin: 0; font-style: italic; color: #555;">
              ${maintenance.description || "Sin descripción"}
            </blockquote>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #f0ad4e; border-bottom: 2px solid #f0ad4e; padding-bottom: 5px; margin-bottom: 15px;">Evidencias Adjuntas</h3>
            ${mediaLinks}
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
             <a href="${process.env.SYSTEM_URL || "https://axzycheckui-production.up.railway.app/#/home"}" style="background-color: #333; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold;">Ir al Panel de Control</a>
          </div>
        </div>
        
        <div style="background-color: #fcfcfc; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #999; margin: 0;">Este es un mensaje automático del sistema de recorridos y seguridad.</p>
        </div>
      </div>
    `;

    if (resend) {
      const { data, error } = await resend.emails.send({
        from: "AXZY Check <noreply@axzy.dev>",
        to: recipients,
        subject: subject,
        html: htmlContent,
      });
      if (error) {
        logger.error("Resend Error (Maintenance):", error);
      } else {
        logger.info("Resend Success (Maintenance):", data);
      }
    } else {
      await transporter.sendMail({
        from: "aamaro@axzy.dev",
        to: recipients,
        subject: subject,
        html: htmlContent,
      });
    }

    logger.info(`Maintenance email sent to ${recipients.join(", ")}`);
  } catch (error) {
    logger.error("Error sending maintenance email:", error);
  }
};

export const sendIncidentWhatsApp = async (incident: any, guard: any) => {
  try {
    const config = await prisma.sysConfig.findUnique({
      where: { key: "INCIDENT_WHATSAPP" },
    });

    if (!config || !config.value) {
      logger.warn("No Recipients found for INCIDENT_WHATSAPP");
      return;
    }

    const recipients = config.value.split("|");
    const incidentUrl = `${process.env.SYSTEM_URL || "https://axzycheckui-production.up.railway.app"}/#/incidents/${incident.id}`;
  } catch (error) {
    logger.error("Error sending incident WhatsApp:", error);
  }
};

export const sendPaymentSuccessEmail = async (payment: any, resident: any) => {
  try {
    const recipientEmail = resident?.email || resident?.user?.email;
    if (!recipientEmail) {
      logger.warn(`No email for resident ${resident?.id}, skipping payment email`);
      return;
    }

    const residentName = resident?.user?.name || resident?.name || "";
    const periodLabel = payment.period
      ? new Date(payment.period + "-01").toLocaleDateString("es-MX", { year: "numeric", month: "long" })
      : "";
    const amountFormatted = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(payment.amount));
    const paidDate = payment.paidAt
      ? new Date(payment.paidAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

    const subject = `Comprobante de Pago - ${payment.fee?.name || "Cuota"}`;
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #065911;">
          <tr>
            <td style="padding: 32px 24px 28px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td width="56" height="56" align="center" style="width: 56px; height: 56px; background-color: rgba(255,255,255,0.15); border-radius: 14px; font-size: 28px; color: #ffffff; font-weight: 700; line-height: 56px;">
                    &#10003;
                  </td>
                </tr>
              </table>
              <p style="color: #ffffff; margin: 14px 0 0; font-size: 18px; font-weight: 800; letter-spacing: 0.2px;">PAGO CONFIRMADO</p>
              <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 12px; font-weight: 500;">Tu pago ha sido procesado exitosamente</p>
            </td>
          </tr>
        </table>
        
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding: 24px 24px 0;">
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px; color: #475569;">
                Hola <strong style="color: #0f172a;">${residentName}</strong>,<br />
                ${periodLabel ? `Tu pago de <strong>${periodLabel}</strong> ha sido acreditado correctamente.` : "Tu pago ha sido acreditado correctamente."}
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                <tr>
                  <td style="padding: 18px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 4px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px;">Concepto</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 14px; font-size: 14px; font-weight: 700; color: #0f172a;">${payment.fee?.name || "Cuota"}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 4px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px;">Monto</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 14px; font-size: 20px; font-weight: 800; color: #065911;">${amountFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 4px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px;">Estado</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 14px;">
                          <span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 700;">PAGADO</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 4px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px;">Fecha de Pago</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 4px; font-size: 13px; font-weight: 600; color: #475569;">${paidDate}</td>
                      </tr>
                      ${payment.id ? `
                      <tr>
                        <td style="padding-top: 10px; padding-bottom: 4px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px;">Folio</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: 600; color: #64748b; font-family: Menlo, 'SF Mono', monospace;">#${String(payment.id).slice(0, 8).toUpperCase()}</td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 22px 0 6px;">
                    <a href="${process.env.SYSTEM_URL || "http://localhost:12345"}/#/payments" style="display: inline-block; background-color: #065911; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 700; font-size: 13px;">Ver Mis Pagos</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <p style="font-size: 10px; color: #94a3b8; margin: 6px 0 0;">Tambien puedes consultar tu estado de cuenta desde la aplicacion movil.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
          <tr>
            <td align="center" style="padding: 14px 24px;">
              <p style="font-size: 10px; color: #94a3b8; margin: 0; font-weight: 600;">AXZY CHECK &mdash; Administracion Residencial</p>
              <p style="font-size: 9px; color: #cbd5e1; margin: 3px 0 0;">Este es un mensaje automatico, por favor no respondas a este correo.</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    if (resend) {
      const { data, error } = await resend.emails.send({
        from: "AXZY Check <noreply@axzy.dev>",
        to: [recipientEmail],
        subject,
        html: htmlContent,
      });
      if (error) {
        logger.error("Resend Error (Payment):", error);
      } else {
        logger.info("Payment success email sent:", data);
      }
    } else {
      await transporter.sendMail({
        from: "aamaro@axzy.dev",
        to: [recipientEmail],
        subject,
        html: htmlContent,
      });
    }

    logger.info(`Payment success email sent to ${recipientEmail}`);
  } catch (error) {
    logger.error("Error sending payment success email:", error);
  }
};

export const sendMaintenanceWhatsApp = async (maintenance: any, guard: any) => {
  try {
    const config = await prisma.sysConfig.findUnique({
      where: { key: "MAINTENANCE_WHATSAPP" },
    });

    if (!config || !config.value) {
      logger.warn("No Recipients found for MAINTENANCE_WHATSAPP");
      return;
    }

    const recipients = config.value.split("|");

    for (const to of recipients) {
      // Note: Using a generic approach for maintenance if no specific template exists yet
      logger.debug(`Sending maintenance WhatsApp to ${to} (Infobip)`);
      // await WhatsAppService.sendTemplateMessage(to, MaintenanceReportTemplate, ...);
    }
  } catch (error) {
    logger.error("Error sending maintenance WhatsApp:", error);
  }
};
