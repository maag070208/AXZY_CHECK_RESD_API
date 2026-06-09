import request from "supertest";
import { app } from "@src/index";
import { prismaClient } from "@src/core/config/database";

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

describe("Rutas de Ubicaciones (Integracion)", () => {
  let createdZoneId: string;
  let createdLocationId: string;
  const uniqueName = `Ubicacion Test ${Date.now()}`;

  beforeAll(async () => {
    const zone = await prismaClient.zone.create({
      data: { name: `Zona Temp para Ubic ${Date.now()}` }
    });
    createdZoneId = zone.id;
  });

  afterAll(async () => {
    if (createdLocationId) await prismaClient.location.delete({ where: { id: createdLocationId } }).catch(() => {});
    if (createdZoneId) await prismaClient.zone.delete({ where: { id: createdZoneId } }).catch(() => {});
  });

  describe("POST /api/v1/locations", () => {
    it("debe crear una nueva ubicacion en la BD", async () => {
      const response = await request(app)
        .post("/api/v1/locations")
        .send({ name: uniqueName, zoneId: createdZoneId });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(uniqueName);
      expect(response.body.data.zoneId).toBe(createdZoneId);

      createdLocationId = response.body.data.id;
      expect(createdLocationId).toBeDefined();
    });

    it("debe retornar 400 si falta el nombre", async () => {
      const response = await request(app)
        .post("/api/v1/locations")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/locations", () => {
    it("debe retornar una lista de ubicaciones desde la BD", async () => {
      const response = await request(app).get("/api/v1/locations");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("PUT /api/v1/locations/:id", () => {
    it("debe actualizar una ubicacion existente en la BD", async () => {
      const response = await request(app)
        .put(`/api/v1/locations/${createdLocationId}`)
        .send({ name: `${uniqueName} Actualizada`, active: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(`${uniqueName} Actualizada`);
    });
  });

  describe("DELETE /api/v1/locations/:id", () => {
    it("debe eliminar una ubicacion de la BD", async () => {
      const response = await request(app).delete(`/api/v1/locations/${createdLocationId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
