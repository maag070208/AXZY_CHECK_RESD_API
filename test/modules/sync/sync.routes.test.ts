import request from "supertest";
import { app } from "@src/index";
import { prismaClient } from "@src/core/config/database";

jest.mock("@src/modules/common/middlewares/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (req.headers["user"]) {
      req.user = JSON.parse(req.headers["user"]);
    }
    next();
  },
  authorize: () => (req: any, res: any, next: any) => next(),
}));

jest.setTimeout(30000);

describe("Rutas de Sincronización (Offline - Sync)", () => {
  let createdZoneId: string;

  beforeAll(async () => {
    // Crear algo para pullear
    const zone = await prismaClient.zone.create({
      data: { name: `Sync Zone ${Date.now()}` }
    });
    createdZoneId = zone.id;
  });

  afterAll(async () => {
    if (createdZoneId) await prismaClient.zone.delete({ where: { id: createdZoneId } }).catch(() => {});
    await prismaClient.zone.deleteMany({ where: { name: "Push Zone" } }).catch(() => {});
  });

  describe("Operaciones de Pull y Push", () => {
    it("debe realizar un pull de cambios desde el inicio de los tiempos", async () => {
      const response = await request(app)
        .get("/api/v1/sync")
        .set("user", JSON.stringify({ id: "admin" }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.changes).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it("debe procesar un push de cambios (creación)", async () => {
      const uniquePushId = crypto.randomUUID();
      const pushData = {
        changes: {
          zone: {
            created: [
              {
                id: uniquePushId,
                name: "Push Zone"
              }
            ],
            updated: [],
            deleted: []
          }
        }
      };

      const response = await request(app)
        .post("/api/v1/sync")
        .set("user", JSON.stringify({ id: "admin" }))
        .send(pushData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar persistencia en BD
      const zone = await prismaClient.zone.findUnique({
        where: { id: uniquePushId }
      });
      expect(zone).toBeDefined();
      expect(zone?.name).toBe("Push Zone");
    });
  });
});
