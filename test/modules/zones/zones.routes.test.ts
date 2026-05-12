import request from "supertest";
import { app } from "@src/index";
import { prismaClient } from "@src/core/config/database";

jest.mock("@src/modules/common/middlewares/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => next(),
  authorize: () => (req: any, res: any, next: any) => next(),
}));

describe("Rutas de Zonas (Integración)", () => {
  let createdZoneId: string;
  const uniqueName = `Zona de Prueba ${Date.now()}`;

  describe("POST /api/v1/zones", () => {
    it("debe crear una nueva zona en la BD", async () => {
      const response = await request(app)
        .post("/api/v1/zones")
        .send({ name: uniqueName });

      if (response.status !== 201) console.log("POST /api/v1/zones ERROR:", response.body);
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(uniqueName);
      
      createdZoneId = response.body.data.id;
    });
  });

  describe("GET /api/v1/zones", () => {
    it("debe retornar una lista de zonas desde la BD", async () => {
      const response = await request(app).get(`/api/v1/zones`);

      if (response.status !== 200) console.log("GET /api/v1/zones ERROR:", response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((z: any) => z.id === createdZoneId)).toBe(true);
    });
  });

  describe("PUT /api/v1/zones/:id", () => {
    it("debe actualizar una zona existente en la BD", async () => {
      const response = await request(app)
        .put(`/api/v1/zones/${createdZoneId}`)
        .send({ name: `${uniqueName} Actualizada`, active: false });

      if (response.status !== 200) console.log("PUT /api/v1/zones/:id ERROR:", response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(`${uniqueName} Actualizada`);
      expect(response.body.data.active).toBe(false);
    });
  });

  describe("DELETE /api/v1/zones/:id", () => {
    it("debe eliminar una zona de la BD", async () => {
      const response = await request(app).delete(`/api/v1/zones/${createdZoneId}`);

      if (response.status !== 200) console.log("DELETE /api/v1/zones/:id ERROR:", response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.softDelete).toBe(true);
    });
  });
});
