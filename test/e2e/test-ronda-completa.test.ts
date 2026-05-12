import request from "supertest";
import { app } from "@src/index";
import { prismaClient } from "@src/core/config/database";
import { ROLE_GUARD, ROLE_ADMIN, ROUND_STATUS_IN_PROGRESS, ROUND_STATUS_COMPLETED } from "@src/core/config/constants";

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

import { getRandomEvidence } from "./test.constants";

describe("Flujo Crítico E2E: Zonas -> Ubicaciones -> Guardias -> Recurrencia -> Ejecución de Ronda", () => {
  let adminHeader: string;
  let guardHeader: string;
  let adminRole: any;
  let guardRole: any;
  
  let zone1Id: string;
  let zone2Id: string;
  let locations: string[] = [];
  let guard1Id: string;
  let guard2Id: string;
  let route1Id: string;
  let route2Id: string;
  let roundId: string;

  beforeAll(async () => {
    adminHeader = JSON.stringify({ id: "admin-e2e", role: "ADMIN" });
    adminRole = await prismaClient.role.findUnique({ where: { name: ROLE_ADMIN } });
    guardRole = await prismaClient.role.findUnique({ where: { name: ROLE_GUARD } });
  });

  afterAll(async () => {
    // Cleanup
    if (route1Id) await prismaClient.recurringConfiguration.delete({ where: { id: route1Id } }).catch(() => {});
    if (route2Id) await prismaClient.recurringConfiguration.delete({ where: { id: route2Id } }).catch(() => {});
    if (guard1Id) await prismaClient.user.delete({ where: { id: guard1Id } }).catch(() => {});
    if (guard2Id) await prismaClient.user.delete({ where: { id: guard2Id } }).catch(() => {});
    for (const locId of locations) {
      await prismaClient.location.delete({ where: { id: locId } }).catch(() => {});
    }
    if (zone1Id) await prismaClient.zone.delete({ where: { id: zone1Id } }).catch(() => {});
    if (zone2Id) await prismaClient.zone.delete({ where: { id: zone2Id } }).catch(() => {});
  });

  it("Paso 1: Dar de alta 2 zonas", async () => {
    const res1 = await request(app)
      .post("/api/v1/zones")
      .set("user", adminHeader)
      .send({ name: `Zona Norte ${Date.now()}` });
    expect(res1.status).toBe(201);
    zone1Id = res1.body.data.id;

    const res2 = await request(app)
      .post("/api/v1/zones")
      .set("user", adminHeader)
      .send({ name: `Zona Sur ${Date.now()}` });
    expect(res2.status).toBe(201);
    zone2Id = res2.body.data.id;
  });

  it("Paso 2: Dar de alta 10 ubicaciones", async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post("/api/v1/locations")
        .set("user", adminHeader)
        .send({ name: `Punto Norte ${i} ${Date.now()}`, zoneId: zone1Id });
      expect(res.status).toBe(201);
      locations.push(res.body.data.id);
    }
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post("/api/v1/locations")
        .set("user", adminHeader)
        .send({ name: `Punto Sur ${i} ${Date.now()}`, zoneId: zone2Id });
      expect(res.status).toBe(201);
      locations.push(res.body.data.id);
    }
    expect(locations.length).toBe(10);
  });

  it("Paso 3: Dar de alta 2 guardias", async () => {
    const res1 = await request(app)
      .post("/api/v1/users")
      .set("user", adminHeader)
      .send({
        name: "Guardia",
        lastName: "Alpha",
        username: `g_alpha_${Date.now()}`,
        password: "password123",
        roleId: guardRole!.id
      });
    expect(res1.status).toBe(201);
    guard1Id = res1.body.data.id;

    const res2 = await request(app)
      .post("/api/v1/users")
      .set("user", adminHeader)
      .send({
        name: "Guardia",
        lastName: "Beta",
        username: `g_beta_${Date.now()}`,
        password: "password123",
        roleId: guardRole!.id
      });
    expect(res2.status).toBe(201);
    guard2Id = res2.body.data.id;

    guardHeader = JSON.stringify({ id: guard1Id, role: "GUARD" });
  });

  it("Paso 4: Generar 2 rutas con 5 ubicaciones cada una", async () => {
    const route1Payload = {
      title: "Ruta Norte Completa",
      guardIds: [guard1Id, guard2Id],
      locations: locations.slice(0, 5).map((locId, index) => ({
        locationId: locId,
        order: index + 1,
        tasks: [
          { description: "Verificar perímetro", reqPhoto: true }
        ]
      }))
    };
    const res1 = await request(app)
      .post("/api/v1/recurring")
      .set("user", adminHeader)
      .send(route1Payload);
    expect(res1.status).toBe(201);
    route1Id = res1.body.data.id;

    const route2Payload = {
      title: "Ruta Sur Completa",
      guardIds: [guard1Id, guard2Id],
      locations: locations.slice(5, 10).map((locId, index) => ({
        locationId: locId,
        order: index + 1,
        tasks: [
          { description: "Revisar candados", reqPhoto: true }
        ]
      }))
    };
    const res2 = await request(app)
      .post("/api/v1/recurring")
      .set("user", adminHeader)
      .send(route2Payload);
    expect(res2.status).toBe(201);
    route2Id = res2.body.data.id;
  });

  it("Paso 5: Iniciar ruta 1", async () => {
    const res = await request(app)
      .post("/api/v1/rounds/start")
      .set("user", guardHeader)
      .send({ recurringConfigurationId: route1Id });
    
    expect(res.status).toBe(200);
    roundId = res.body.data.id;
  });

  it("Paso 6: Escanear QRs", async () => {
    const route1Locations = locations.slice(0, 5);
    for (let i = 0; i < route1Locations.length; i++) {
      const locId = route1Locations[i];
      const mediaUrls = getRandomEvidence(2);
      
      const res = await request(app)
        .post("/api/v1/kardex")
        .set("user", guardHeader)
        .send({
          userId: guard1Id,
          locationId: locId,
          notes: `Escaneo ${i + 1}`,
          media: mediaUrls
        });
      expect(res.status).toBe(201);
    }
  });

  it("Paso 7: Finalizar ronda", async () => {
    const res = await request(app)
      .put(`/api/v1/rounds/${roundId}/end`)
      .set("user", guardHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ROUND_STATUS_COMPLETED);
  });
});
