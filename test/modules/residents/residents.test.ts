import request from "supertest";
import { app } from "@src/index";
import { prismaClient } from "@src/core/config/database";
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

const uid = Date.now();
let houseId: string;
let userId: string;
let residentId: string;
let secondUserId: string;
let secondResidentId: string;
let createdByCreateUserId: string;

const adminUser = { id: "admin-test-id", role: "ADMINI" };

describe("Residentes CRUD", () => {
  afterAll(async () => {
    if (secondResidentId) await prismaClient.resident.delete({ where: { id: secondResidentId } }).catch(() => {});
    if (secondUserId) await prismaClient.user.delete({ where: { id: secondUserId } }).catch(() => {});
    if (residentId) await prismaClient.resident.delete({ where: { id: residentId } }).catch(() => {});
    if (userId) await prismaClient.user.delete({ where: { id: userId } }).catch(() => {});
    if (houseId) await prismaClient.house.delete({ where: { id: houseId } }).catch(() => {});
  });

  beforeAll(async () => {
    const house = await prismaClient.house.create({
      data: { number: `RESCRUD-${uid}`, street: "Calle Residente", block: "C" },
    });
    houseId = house.id;

    const resdnRole = await prismaClient.role.findUniqueOrThrow({ where: { name: "RESDN" } });

    const user = await prismaClient.user.create({
      data: {
        name: "ResidenteCRUD", lastName: "Test", username: `res_crud_${uid}`,
        password: hashSync("test123", 10), roleId: resdnRole.id,
      },
    });
    userId = user.id;

    const resident = await prismaClient.resident.create({
      data: { userId: user.id, houseId, phone: "2222222222", email: "residente@test.com" },
    });
    residentId = resident.id;

    const user2 = await prismaClient.user.create({
      data: {
        name: "Segundo", lastName: "Vecino", username: `res_crud2_${uid}`,
        password: hashSync("test123", 10), roleId: resdnRole.id,
      },
    });
    secondUserId = user2.id;
  });

  describe("GET /api/v1/residents/:id", () => {
    it("debe obtener residente por ID", async () => {
      const res = await request(app)
        .get(`/api/v1/residents/${residentId}`)
        .set("user", JSON.stringify(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(residentId);
      expect(res.body.data.user.name).toBe("ResidenteCRUD");
      expect(res.body.data.houseId).toBe(houseId);
    });

    it("debe retornar null para ID inexistente", async () => {
      const res = await request(app)
        .get("/api/v1/residents/00000000-0000-0000-0000-000000000000")
        .set("user", JSON.stringify(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  describe("POST /api/v1/residents/datatable", () => {
    it("debe listar residentes paginados", async () => {
      const res = await request(app)
        .post("/api/v1/residents/datatable")
        .set("user", JSON.stringify(adminUser))
        .send({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rows).toBeDefined();
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.rows[0].user).toBeDefined();
    });

    it("debe filtrar por búsqueda", async () => {
      const res = await request(app)
        .post("/api/v1/residents/datatable")
        .set("user", JSON.stringify(adminUser))
        .send({ page: 1, limit: 10, filters: { search: "ResidenteCRUD" } });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("POST /api/v1/residents — crear", () => {
    it("debe crear residente con datos de usuario nuevo", async () => {
      const res = await request(app)
        .post("/api/v1/residents")
        .set("user", JSON.stringify(adminUser))
        .send({
          user: { name: "Nuevo", lastName: "Residente", username: `nuevo_res_${uid}`, password: "pass1234" },
          houseId,
          phone: "3333333333",
          email: "nuevo@test.com",
          isOwner: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe("Nuevo");
      expect(res.body.data.phone).toBe("3333333333");
      expect(res.body.data.isOwner).toBe(true);

      secondResidentId = res.body.data.id;
      createdByCreateUserId = res.body.data.userId;
    });

    it("debe rechazar con username duplicado", async () => {
      const res = await request(app)
        .post("/api/v1/residents")
        .set("user", JSON.stringify(adminUser))
        .send({
          user: { name: "Otro", username: `res_crud_${uid}`, password: "pass1234" },
          houseId,
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it("debe rechazar sin userId ni datos de usuario", async () => {
      const res = await request(app)
        .post("/api/v1/residents")
        .set("user", JSON.stringify(adminUser))
        .send({ houseId });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/v1/residents/:id", () => {
    it("debe actualizar datos del residente", async () => {
      const res = await request(app)
        .put(`/api/v1/residents/${residentId}`)
        .set("user", JSON.stringify(adminUser))
        .send({ phone: "9999999999", email: "actualizado@test.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe("9999999999");
      expect(res.body.data.email).toBe("actualizado@test.com");
    });

    it("debe desactivar residente y cascada al usuario", async () => {
      const res = await request(app)
        .put(`/api/v1/residents/${residentId}`)
        .set("user", JSON.stringify(adminUser))
        .send({ active: false });

      expect(res.status).toBe(200);
      expect(res.body.data.active).toBe(false);

      const user = await prismaClient.user.findUnique({ where: { id: userId } });
      expect(user?.active).toBe(false);
    });
  });

  describe("DELETE /api/v1/residents/:id", () => {
    it("debe eliminar (soft) residente y cascada al usuario", async () => {
      const res = await request(app)
        .delete(`/api/v1/residents/${secondResidentId}`)
        .set("user", JSON.stringify(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.active).toBe(false);
      expect(res.body.data.deletedAt).toBeTruthy();

      const user = await prismaClient.user.findUnique({
        where: { id: createdByCreateUserId },
      });
      expect(user?.active).toBe(false);
    });
  });

  describe("GET /api/v1/residents/me", () => {
    it("debe retornar residente del usuario autenticado", async () => {
      const residentUser = { id: userId, role: "RESDN" };
      const res = await request(app)
        .get("/api/v1/residents/me")
        .set("user", JSON.stringify(residentUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(userId);
    });
  });
});
