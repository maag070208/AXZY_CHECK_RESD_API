import Stripe from "stripe";
import { env } from "@src/core/config/env.config";
import { logger } from "@src/core/utils/logger";
import { prismaClient } from "@src/core/config/database";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock";
const stripe = new Stripe(stripeSecretKey as string);

export const stripeService = {
  /**
   * Retrieves or creates a Stripe customer for a resident.
   */
  async getOrCreateCustomer(residentId: string, email?: string, name?: string): Promise<string> {
    const resident = await prismaClient.resident.findUnique({
      where: { id: residentId },
    });
    
    if (!resident) throw new Error("Resident not found");

    if (resident.stripeCustomerId) {
      return resident.stripeCustomerId;
    }

    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      email: email || resident.email || undefined,
      name: name || undefined,
      metadata: {
        residentId,
      },
    });

    await prismaClient.resident.update({
      where: { id: residentId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  },

  /**
   * Creates a checkout session for a subscription plan.
   */
  async createSubscriptionCheckout(residentId: string, planId: string, successUrl: string, cancelUrl: string) {
    const resident = await prismaClient.resident.findUnique({
      where: { id: residentId },
      include: { user: true },
    });

    if (!resident) throw new Error("Resident not found");

    const plan = await prismaClient.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) throw new Error("Subscription Plan not found");

    const customerId = await this.getOrCreateCustomer(
      residentId,
      resident.email || undefined,
      `${resident.user.name} ${resident.user.lastName || ""}`
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        residentId,
        planId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session;
  },

  /**
   * Creates a checkout session for a one-time specific payment (Fee).
   */
  async createPaymentCheckout(paymentId: string, successUrl: string, cancelUrl: string) {
    const payment = await prismaClient.payment.findUnique({
      where: { id: paymentId },
      include: {
        resident: { include: { user: true } },
        fee: true,
      },
    });

    if (!payment) throw new Error("Payment not found");
    if (payment.status === "PAID") throw new Error("Payment already paid");

    const resident = payment.resident;
    const customerId = await this.getOrCreateCustomer(
      resident.id,
      resident.email || undefined,
      `${resident.user.name} ${resident.user.lastName || ""}`
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: payment.fee?.name || "Pago de Cuota",
              description: payment.fee?.description || undefined,
            },
            unit_amount: Math.round(Number(payment.amount) * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment.id,
        residentId: resident.id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session;
  },

  /**
   * Verifies Stripe webhook signature.
   */
  constructEvent(rawBody: string | Buffer, signature: string, webhookSecret: string): any {
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  },

  /**
   * Retrieves a checkout session by ID. Used as a fallback when the webhook
   * is delayed or not configured.
   */
  async retrieveCheckoutSession(sessionId: string) {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err: any) {
      logger.error(`Failed to retrieve Stripe session ${sessionId}: ${err.message}`);
      return null;
    }
  },
};
