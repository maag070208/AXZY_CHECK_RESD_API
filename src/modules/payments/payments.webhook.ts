import { Request, Response } from "express";
import { stripeService } from "./stripe.service";
import { logger } from "@src/core/utils/logger";
import { prismaClient } from "@src/core/config/database";
import { handleRecurringPayment } from "./payments.service";
import { sendPaymentSuccessEmail } from "@src/core/utils/emailSender";
import { generateAndUploadReceipt } from "./payments.receipt.service";
import Stripe from "stripe";

const markPaymentAsPaid = async (
  paymentId: string,
  paymentIntentId: string,
  notes: string,
) => {
  const payment = await prismaClient.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, residentId: true, feeId: true, amount: true, period: true, createdAt: true, fee: { select: { name: true } } },
  });

  if (!payment || payment.status === "PAID") return;

  await prismaClient.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        stripePaymentIntentId: paymentIntentId,
        paidAt: new Date(),
      },
    });

    await tx.paymentLog.create({
      data: {
        paymentId,
        residentId: payment.residentId,
        action: "STATUS_CHANGE",
        statusFrom: payment.status as any,
        statusTo: "PAID",
        amount: payment.amount,
        notes,
      },
    });

    if (payment.feeId) {
      await handleRecurringPayment(tx, payment.residentId, payment.feeId, payment.period);
    }
  });

  logger.info(`Payment ${paymentId} completed via Stripe (PI: ${paymentIntentId})`);

  prismaClient.resident.findUnique({
    where: { id: payment.residentId },
    select: { id: true, email: true, phone: true, user: { select: { name: true, lastName: true } } },
  }).then(async (residentFull) => {
    if (residentFull) {
      sendPaymentSuccessEmail(
        { amount: payment.amount, fee: null },
        { ...residentFull, name: residentFull.user?.name },
      );

      const receiptUrl = await generateAndUploadReceipt(
        { ...payment, stripePaymentIntentId: paymentIntentId, paidAt: new Date() },
        residentFull,
      );
      if (receiptUrl) {
        await prismaClient.payment.update({
          where: { id: paymentId },
          data: { s3ReceiptUrl: receiptUrl },
        });
        logger.info(`Receipt PDF uploaded for payment ${paymentId}: ${receiptUrl}`);
      }
    }
  }).catch((err) => logger.error("Error processing post-payment tasks:", err));
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    if (!webhookSecret) {
      if (process.env.NODE_ENV === "production") {
        logger.error("Missing STRIPE_WEBHOOK_SECRET in production - rejecting");
        return res.status(500).send("Webhook misconfigured");
      }
      logger.warn("No STRIPE_WEBHOOK_SECRET, skipping validation (dev only)");
      event = req.body as any;
    } else {
      const rawBody = (req as any).rawBody;
      if (!rawBody) throw new Error("Missing rawBody");
      event = stripeService.constructEvent(rawBody, signature as string, webhookSecret);
    }
  } catch (err: any) {
    logger.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        if (session.mode === "subscription") {
          const residentId = session.metadata?.residentId;
          const planId = session.metadata?.planId;
          const subscriptionId = session.subscription as string;

          if (residentId && planId && subscriptionId) {
            await prismaClient.residentSubscription.upsert({
              where: { stripeSubscriptionId: subscriptionId },
              create: {
                residentId,
                planId,
                stripeSubscriptionId: subscriptionId,
                status: "active",
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              },
              update: {
                status: "active"
              }
            });
            logger.info(`Subscription ${subscriptionId} created for resident ${residentId}`);
          }
        } else if (session.mode === "payment") {
          const paymentId = session.metadata?.paymentId;
          const paymentIntentId = session.payment_intent as string;

          if (paymentId) {
            await markPaymentAsPaid(
              paymentId,
              paymentIntentId,
              "Pagado vía Stripe Checkout",
            );
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object as any;
        const paymentId = intent.metadata?.paymentId;
        if (paymentId) {
          await markPaymentAsPaid(
            paymentId,
            intent.id,
            "Pagado vía Stripe (native mobile SDK)",
          );
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as any;
        const paymentId = intent.metadata?.paymentId;
        const failureMessage = intent.last_payment_error?.message || "Pago rechazado";
        if (paymentId) {
          const payment = await prismaClient.payment.findUnique({
            where: { id: paymentId },
            select: { id: true, status: true, residentId: true, amount: true },
          });
          if (payment && payment.status !== "FAILED") {
            await prismaClient.$transaction(async (tx) => {
              await tx.payment.update({
                where: { id: paymentId },
                data: { status: "FAILED" },
              });
              await tx.paymentLog.create({
                data: {
                  paymentId,
                  residentId: payment.residentId,
                  action: "STATUS_CHANGE",
                  statusFrom: payment.status as any,
                  statusTo: "FAILED",
                  amount: payment.amount,
                  notes: `Pago fallido: ${failureMessage}`,
                },
              });
            });
            logger.warn(`Payment ${paymentId} failed via Stripe: ${failureMessage}`);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          const sub = await prismaClient.residentSubscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId }
          });
          
          if (sub) {
            // Update subscription dates
            await prismaClient.residentSubscription.update({
              where: { id: sub.id },
              data: {
                status: "active",
                currentPeriodStart: new Date(invoice.period_start * 1000),
                currentPeriodEnd: new Date(invoice.period_end * 1000)
              }
            });

            // Create Payment record
            const fee = await prismaClient.fee.findFirst({
              where: { name: "Mensualidad" } // Generic mapping or based on plan
            });
            
            if (fee) {
              await prismaClient.payment.create({
                data: {
                  residentId: sub.residentId,
                  feeId: fee.id,
                  amount: invoice.amount_paid / 100, // Stripe uses cents
                  status: "PAID",
                  stripeInvoiceId: invoice.id,
                  stripePaymentIntentId: invoice.payment_intent as string,
                  paidAt: new Date(),
                  reference: `Factura Stripe: ${invoice.number}`
                }
              });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          await prismaClient.residentSubscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "past_due" }
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        await prismaClient.residentSubscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "canceled" }
        });
        break;
      }
      
      default:
        logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (error: any) {
    logger.error(`Error processing Stripe webhook: ${error.message}`);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  res.json({ received: true });
};
