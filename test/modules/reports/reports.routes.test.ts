import request from "supertest";
import { app } from "@src/index";
import { prismaClient } from "@src/core/config/database";
import { ROLE_GUARD } from "@src/core/config/constants";

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

jest.mock("@src/core/middlewares/token-validator.middleware", () => ({
  __esModule: true,
  default: (req: any, res: any, next: any) => {
    if (req.headers["user"]) {
      const user = JSON.parse(req.headers["user"]);
      req.user = user;
      res.locals.user = user;
    }
    next();
  },
}));

describe("Rutas de Reportes (Integración Total)", () => {
  let createdGuardId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const adminHeader = JSON.stringify({ id: "admin", role: "ADMIN" });

    // 1. Obtener Role
    const guardRole = await prismaClient.role.findUnique({ where: { name: ROLE_GUARD } });

    // 2. Crear Guardia
    const guardRes = await request(app)
      .post("/api/v1/users")
      .set("user", adminHeader)
      .send({
        name: "Guardia",
        lastName: "Reporteador",
        username: `guardia_rep_${Date.now()}`,
        password: "password123",
        roleId: guardRole!.id
      });
    createdGuardId = guardRes.body.data.id;
    
    adminUserId = "admin-id";
  });

  afterAll(async () => {
    if (createdGuardId) await prismaClient.user.delete({ where: { id: createdGuardId } }).catch(() => {});
  });

  describe("Endpoints de Analítica y Reportes", () => {
    const getFilters = () => `startDate=2024-01-01&endDate=2026-12-31`;

    it("debe retornar estadísticas generales de guardias", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/guards/stats?${getFilters()}`)
        .set("user", JSON.stringify({ id: adminUserId, role: "ADMIN" }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("totalScans");
    });

    it("debe retornar el top de desempeño de guardias", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/guards/top-performance?${getFilters()}`)
        .set("user", JSON.stringify({ id: adminUserId, role: "ADMIN" }));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("debe retornar la distribución de actividad", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/guards/distribution?${getFilters()}`)
        .set("user", JSON.stringify({ id: adminUserId, role: "ADMIN" }));

      expect(response.status).toBe(200);
    });

    it("debe retornar el reporte detallado de guardias", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/guards/detail?${getFilters()}`)
        .set("user", JSON.stringify({ id: adminUserId, role: "ADMIN" }));

      expect(response.status).toBe(200);
    });

    it("debe retornar el desglose por guardia específico", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/guards/detail-breakdown/${createdGuardId}?${getFilters()}`)
        .set("user", JSON.stringify({ id: adminUserId, role: "ADMIN" }));

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("missedPoints");
    });

    it("debe retornar la comparación de carga de trabajo", async () => {
        const response = await request(app)
          .get(`/api/v1/reports/guards/workload?${getFilters()}`)
          .set("user", JSON.stringify({ id: adminUserId, role: "ADMIN" }));
  
        expect(response.status).toBe(200);
    });
  });
});
