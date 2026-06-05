import request from "supertest";
import { app } from "@src/index";
import { prismaClient } from "@src/core/config/database";
import { hashSync } from "bcryptjs";

jest.mock("@src/modules/common/middlewares/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (req.headers["user"]) {
      const user = JSON.parse(req.headers["user"]);
      req.user = user;
      res.locals.user = user;
    }
    next();
  },
  authorize: () => (req: any, res: any, next: any) => next(),
}));

describe("Rutas de Cuotas Asignadas (Integración)", () => {
  let createdFeeId: string;
  let createdResidentId: string;
  let createdUserId: string;
  let createdHouseId: string;
  let createdResidentFeeId: string;
  const uniqueSuffix = Date.now();

  let resdnRoleId: string;

  beforeAll(async () => {
    const resdnRole = await prismaClient.role.findUniqueOrThrow({ where: { name: "RESDN" } });
    resdnRoleId = resdnRole.id;

    // Crear Fee
    const fee = await prismaClient.fee.create({
      data: {
        name: `Cuota Test ${uniqueSuffix}`,
        amount: 500,
        dueDate: new Date("2026-07-01"),
        type: "MONTHLY",
      },
    });
    createdFeeId = fee.id;

    // Crear House
    const house = await prismaClient.house.create({
      data: {
        number: `RF-TEST-${uniqueSuffix}`,
        street: "Calle RF Test",
        block: "B",
      },
    });
    createdHouseId = house.id;

    // Crear User
    const user = await prismaClient.user.create({
      data: {
        name: `Residente RF ${uniqueSuffix}`,
        lastName: "Test",
        username: `residente_rf_${uniqueSuffix}`,
        password: hashSync("test123", 10),
        roleId: resdnRoleId,
      },
    });
    createdUserId = user.id;

    // Crear Resident
    const resident = await prismaClient.resident.create({
      data: {
        userId: user.id,
        houseId: house.id,
        phone: "5555555555",
      },
    });
    createdResidentId = resident.id;
  });

  afterAll(async () => {
    if (createdResidentFeeId) {
      await prismaClient.residentFee.delete({ where: { id: createdResidentFeeId } }).catch(() => {});
    }
    if (createdResidentId) {
      await prismaClient.resident.delete({ where: { id: createdResidentId } }).catch(() => {});
    }
    if (createdUserId) {
      await prismaClient.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    if (createdHouseId) {
      await prismaClient.house.delete({ where: { id: createdHouseId } }).catch(() => {});
    }
    if (createdFeeId) {
      await prismaClient.fee.delete({ where: { id: createdFeeId } }).catch(() => {});
    }
  });

  const adminUser = { id: "admin-test-id", role: "ADMINI" };

  describe("POST /api/v1/payments/resident-fees", () => {
    it("debe asignar una cuota a un residente", async () => {
      const response = await request(app)
        .post("/api/v1/payments/resident-fees")
        .set("user", JSON.stringify(adminUser))
        .send({ residentId: createdResidentId, feeId: createdFeeId });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.residentId).toBe(createdResidentId);
      expect(response.body.data.feeId).toBe(createdFeeId);
      expect(response.body.data.active).toBe(true);

      createdResidentFeeId = response.body.data.id;
    });

    it("debe rechazar asignación con residentId inválido", async () => {
      const response = await request(app)
        .post("/api/v1/payments/resident-fees")
        .set("user", JSON.stringify(adminUser))
        .send({ residentId: "no-uuid", feeId: createdFeeId });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/payments/resident-fees", () => {
    it("debe listar cuotas asignadas filtradas por residente", async () => {
      const response = await request(app)
        .get(`/api/v1/payments/resident-fees?residentId=${createdResidentId}`)
        .set("user", JSON.stringify(adminUser));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].residentId).toBe(createdResidentId);
    });
  });

  describe("POST /api/v1/payments/resident-fees/datatable", () => {
    it("debe retornar listado paginado", async () => {
      const response = await request(app)
        .post("/api/v1/payments/resident-fees/datatable")
        .set("user", JSON.stringify(adminUser))
        .send({ page: 1, limit: 10, filters: { residentId: createdResidentId } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rows).toBeDefined();
      expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe("POST /api/v1/payments/resident-fees/bulk", () => {
    it("debe asignar cuota a múltiples residentes", async () => {
      const response = await request(app)
        .post("/api/v1/payments/resident-fees/bulk")
        .set("user", JSON.stringify(adminUser))
        .send({ residentIds: [createdResidentId], feeId: createdFeeId });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("DELETE /api/v1/payments/resident-fees/:id", () => {
    it("debe desasignar (soft delete) una cuota de residente", async () => {
      expect(createdResidentFeeId).toBeTruthy();

      const response = await request(app)
        .delete(`/api/v1/payments/resident-fees/${createdResidentFeeId}`)
        .set("user", JSON.stringify(adminUser));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.active).toBe(false);
    });
  });
});
