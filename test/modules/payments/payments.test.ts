import request from "supertest";
import { app } from "@src/index";
import { prismaClient as prisma } from "@src/core/config/database";
import { hashSync } from "bcryptjs";

jest.mock("@src/modules/common/middlewares/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (req.headers["user"]) {
      req.user = JSON.parse(req.headers["user"]);
      res.locals.user = JSON.parse(req.headers["user"]);
    }
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("@src/modules/payments/stripe.service", () => ({
  stripeService: {
    createPaymentCheckout: jest.fn().mockResolvedValue({
      id: "cs_test_mock",
      url: "https://checkout.stripe.com/mock",
    }),
    getOrCreateCustomer: jest.fn().mockResolvedValue("cus_mock"),
  },
}));

const uid = Date.now();
let houseId: string;
let userId: string;
let residentId: string;
let feeId: string;
let paymentId: string;
let paymentFeeId: string;

const adminUser = { id: "admin-test-id", role: "ADMINI" };

describe("Payments — Fees CRUD", () => {
  afterAll(async () => {
    if (feeId) await prisma.fee.update({ where: { id: feeId }, data: { deletedAt: null, active: true } }).catch(() => {});
  });

  beforeAll(async () => {
    const house = await prisma.house.create({
      data: { number: `PAYTEST-${uid}`, street: "Calle Test", block: "A" },
    });
    houseId = house.id;

    const resdnRole = await prisma.role.findUniqueOrThrow({ where: { name: "RESDN" } });

    const user = await prisma.user.create({
      data: {
        name: "PagoTest", lastName: "User", username: `pago_test_${uid}`,
        password: hashSync("test123", 10), roleId: resdnRole.id,
      },
    });
    userId = user.id;

    const resident = await prisma.resident.create({
      data: { userId: user.id, houseId: house.id, phone: "1111111111" },
    });
    residentId = resident.id;
  });

  it("POST /api/v1/payments/fees — debe crear cuota ONE_TIME con fecha", async () => {
    const res = await request(app)
      .post("/api/v1/payments/fees")
      .set("user", JSON.stringify(adminUser))
      .send({ name: `Cuota Test ${uid}`, amount: 1000, type: "ONE_TIME", dueDate: "2026-08-01" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`Cuota Test ${uid}`);
    expect(String(res.body.data.amount)).toBe("1000");
    expect(res.body.data.type).toBe("ONE_TIME");
    expect(res.body.data.dueDate).toBeTruthy();
    feeId = res.body.data.id;
  });

  it("POST /api/v1/payments/fees — debe rechazar ONE_TIME sin dueDate", async () => {
    const res = await request(app)
      .post("/api/v1/payments/fees")
      .set("user", JSON.stringify(adminUser))
      .send({ name: "Incompleta", amount: 500, type: "ONE_TIME" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/payments/fees — debe crear cuota MONTHLY sin dueDate", async () => {
    const res = await request(app)
      .post("/api/v1/payments/fees")
      .set("user", JSON.stringify(adminUser))
      .send({ name: `Mensual ${uid}`, amount: 500, type: "MONTHLY" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe("MONTHLY");
    expect(res.body.data.dueDate).toBeNull();
    await prisma.fee.delete({ where: { id: res.body.data.id } }).catch(() => {});
  });

  it("GET /api/v1/payments/fees — debe listar cuotas", async () => {
    const res = await request(app)
      .get("/api/v1/payments/fees")
      .set("user", JSON.stringify(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/v1/payments/fees/:id — debe obtener cuota por ID", async () => {
    const res = await request(app)
      .get(`/api/v1/payments/fees/${feeId}`)
      .set("user", JSON.stringify(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(feeId);
  });

  it("PUT /api/v1/payments/fees/:id — debe actualizar cuota", async () => {
    const res = await request(app)
      .put(`/api/v1/payments/fees/${feeId}`)
      .set("user", JSON.stringify(adminUser))
      .send({ amount: 1200, name: `Cuota Actualizada ${uid}` });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(String(res.body.data.amount)).toBe("1200");
    expect(res.body.data.name).toBe(`Cuota Actualizada ${uid}`);
  });

  it("DELETE /api/v1/payments/fees/:id — debe eliminar (soft) cuota", async () => {
    const res = await request(app)
      .delete(`/api/v1/payments/fees/${feeId}`)
      .set("user", JSON.stringify(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.active).toBe(false);
    expect(res.body.data.deletedAt).toBeTruthy();
  });
});

describe("Payments — Payments CRUD + Summary", () => {
  beforeAll(async () => {
    const fee = await prisma.fee.create({
      data: {
        name: `PagoFee ${uid}`,
        amount: 1000,
        type: "ONE_TIME",
        dueDate: new Date("2026-09-01"),
      },
    });
    paymentFeeId = fee.id;
  });

  it("POST /api/v1/payments — debe crear pago PENDING", async () => {
    const res = await request(app)
      .post("/api/v1/payments")
      .set("user", JSON.stringify(adminUser))
      .send({ residentId, feeId: paymentFeeId, amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.residentId).toBe(residentId);
    expect(res.body.data.feeId).toBe(paymentFeeId);
    expect(String(res.body.data.amount)).toBe("1000");
    expect(res.body.data.status).toBe("PENDING");
    paymentId = res.body.data.id;
  });

  it("POST /api/v1/payments — debe rechazar con residentId inválido", async () => {
    const res = await request(app)
      .post("/api/v1/payments")
      .set("user", JSON.stringify(adminUser))
      .send({ residentId: "no-uuid", feeId: paymentFeeId, amount: 500 });

    expect(res.status).toBe(400);
  });

  it("GET /api/v1/payments/:id — debe obtener pago", async () => {
    const res = await request(app)
      .get(`/api/v1/payments/${paymentId}`)
      .set("user", JSON.stringify(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(paymentId);
    expect(res.body.data.fee).toBeDefined();
    expect(res.body.data.resident).toBeDefined();
  });

  it("POST /api/v1/payments/datatable — debe listar pagos paginados", async () => {
    const res = await request(app)
      .post("/api/v1/payments/datatable")
      .set("user", JSON.stringify(adminUser))
      .send({ page: 1, limit: 10, filters: { residentId } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rows).toBeDefined();
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/v1/payments/summary — debe retornar resumen", async () => {
    const res = await request(app)
      .get("/api/v1/payments/summary")
      .set("user", JSON.stringify(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pending).toBeDefined();
    expect(res.body.data.paid).toBeDefined();
  });

  it("POST /api/v1/payments/:id/checkout — debe crear sesión de Stripe (PENDING)", async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${paymentId}/checkout`)
      .set("user", JSON.stringify(adminUser))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toContain("checkout.stripe.com");
  });

  it("PUT /api/v1/payments/:id — debe marcar como PAID", async () => {
    const res = await request(app)
      .put(`/api/v1/payments/${paymentId}`)
      .set("user", JSON.stringify(adminUser))
      .send({ status: "PAID", reference: "TEST-REF-001" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("PAID");
  });

  it("POST /api/v1/payments/:id/checkout — debe crear sesión incluso si está PAID (mock)", async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${paymentId}/checkout`)
      .set("user", JSON.stringify(adminUser))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toContain("checkout.stripe.com");
  });

  it("DELETE /api/v1/payments/:id — debe cancelar pago", async () => {
    const res = await request(app)
      .delete(`/api/v1/payments/${paymentId}`)
      .set("user", JSON.stringify(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("CANCELLED");
    expect(res.body.data.deletedAt).toBeTruthy();
  });

  it("GET /api/v1/payments/:id — no encontrado después de soft delete", async () => {
    const res = await request(app)
      .get(`/api/v1/payments/${paymentId}`)
      .set("user", JSON.stringify(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("GET /api/v1/payments/receipt/:id/download — debe rechazar si no existe", async () => {
    const res = await request(app)
      .get(`/api/v1/payments/receipt/${paymentId}/download`)
      .set("user", JSON.stringify(adminUser));

    expect(res.status).toBe(404);
  });
});

afterAll(async () => {
  if (paymentId) await prisma.paymentLog.deleteMany({ where: { paymentId } }).catch(() => {});
  if (paymentId) await prisma.payment.delete({ where: { id: paymentId } }).catch(() => {});
  if (feeId) await prisma.fee.delete({ where: { id: feeId } }).catch(() => {});
  if (paymentFeeId) await prisma.fee.delete({ where: { id: paymentFeeId } }).catch(() => {});
  if (residentId) await prisma.resident.delete({ where: { id: residentId } }).catch(() => {});
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  if (houseId) await prisma.house.delete({ where: { id: houseId } }).catch(() => {});
});
