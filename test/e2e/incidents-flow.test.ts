import { ROLE_ADMIN, ROLE_GUARD } from "@src/core/config/constants";
import { prismaClient } from "@src/core/config/database";
import { app } from "@src/index";
import request from "supertest";
import { getRandomEvidence } from "./test.constants";

jest.setTimeout(60000);

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

describe("Flujo Crítico E2E: Gestión de Incidencias", () => {
  let adminHeader: string;
  let guardHeader: string;
  let guardId: string;
  let incidentId: string;

  beforeAll(async () => {
    const adminRole = await prismaClient.role.findUnique({
      where: { name: ROLE_ADMIN },
    });
    const guardRole = await prismaClient.role.findUnique({
      where: { name: ROLE_GUARD },
    });

    // Admin user
    const adminUser = await prismaClient.user.create({
      data: {
        name: "Admin",
        lastName: "E2E Inc",
        username: `a_e2e_inc_${Date.now()}`,
        password: "password123",
        roleId: adminRole!.id,
      },
    });
    adminHeader = JSON.stringify({ id: adminUser.id, role: "ADMIN" });

    // Guard user
    const guardUser = await prismaClient.user.create({
      data: {
        name: "Guard",
        lastName: "E2E Inc",
        username: `g_e2e_inc_${Date.now()}`,
        password: "password123",
        roleId: guardRole!.id,
      },
    });
    guardId = guardUser.id;
    guardHeader = JSON.stringify({ id: guardId, role: "GUARD" });
  });

  afterAll(async () => {
    // Cleanup users
    if (guardId)
      await prismaClient.user
        .delete({ where: { id: guardId } })
        .catch(() => {});
  });

  it("Paso 1: Generar incidencia como guardia", async () => {
    const randomMedia = getRandomEvidence(4);
    const response = await request(app)
      .post("/api/v1/incidents")
      .set("user", guardHeader)
      .send({
        title: "Incidencia E2E con Videos",
        description: "Reporte de persona sospechosa",
        media: randomMedia,
        latitude: 19.4326,
        longitude: -99.1332,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.media).toHaveLength(5); // 4 photos + 1 video
    expect(response.body.data.status).toBe("PENDING");

    incidentId = response.body.data.id;
  });

  it("Paso 2: Ver las incidencias en el Datatable (Admin)", async () => {
    const response = await request(app)
      .post("/api/v1/incidents/datatable")
      .set("user", adminHeader)
      .send({
        page: 1,
        limit: 10,
        filters: {},
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const found = response.body.data.rows.find(
      (inc: any) => inc.id === incidentId,
    );
    expect(found).toBeDefined();
    expect(found.title).toBe("Incidencia E2E con Videos");
  });

  it("Paso 3: Aprobar (Resolver) la incidencia (Admin)", async () => {
    const response = await request(app)
      .put(`/api/v1/incidents/${incidentId}/resolve`)
      .set("user", adminHeader)
      .send({});

    if (response.status !== 200) console.log(response.body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ATTENDED");
  });

  it("Paso 4: Verificar cambio de estatus en DB", async () => {
    const incidentInDb = await prismaClient.incident.findUnique({
      where: { id: incidentId },
    });

    expect(incidentInDb).toBeDefined();
    expect(incidentInDb?.status).toBe("ATTENDED");
  });
});
