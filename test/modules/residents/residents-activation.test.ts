import request from "supertest";
import { app } from "@src/index";
import { prismaClient } from "@src/core/config/database";
import { ROLE_ADMIN, ROLE_CLIENT } from "@src/core/config/constants";
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

describe("Cascada de activación Residente ↔ Usuario", () => {
  let createdResidentId: string;
  let createdUserId: string;
  let createdAdminId: string;
  let createdHouseId: string;
  let resdnRoleId: string;
  let adminRoleId: string;
  const ts = Date.now();

  beforeAll(async () => {
    const adminRole = await prismaClient.role.findUnique({ where: { name: ROLE_ADMIN } });
    const resdnRole = await prismaClient.role.findUnique({ where: { name: ROLE_CLIENT } });
    adminRoleId = adminRole!.id;
    resdnRoleId = resdnRole!.id;

    const adminUser = await prismaClient.user.create({
      data: {
        name: "Admin Activation",
        lastName: "Test",
        username: `admin_act_${ts}`,
        password: hashSync("admin123", 10),
        roleId: adminRoleId,
      },
    });
    createdAdminId = adminUser.id;

    const house = await prismaClient.house.create({
      data: { number: `ACT-${ts}`, street: "Calle Activation", block: "A" },
    });
    createdHouseId = house.id;

    const user = await prismaClient.user.create({
      data: {
        name: "Residente Act",
        lastName: "Test",
        username: `res_act_${ts}`,
        password: hashSync("test123", 10),
        roleId: resdnRoleId,
        active: true,
      },
    });
    createdUserId = user.id;

    const resident = await prismaClient.resident.create({
      data: {
        userId: user.id,
        houseId: house.id,
        phone: "5550000000",
        active: true,
      },
    });
    createdResidentId = resident.id;
  });

  afterAll(async () => {
    const ids = [createdResidentId, createdUserId, createdAdminId, createdHouseId];
    const delResident = prismaClient.resident.delete({ where: { id: ids[0] } }).catch(() => {});
    const delUser = prismaClient.user.delete({ where: { id: ids[1] } }).catch(() => {});
    const delAdmin = prismaClient.user.delete({ where: { id: ids[2] } }).catch(() => {});
    const delHouse = prismaClient.house.delete({ where: { id: ids[3] } }).catch(() => {});
    await Promise.all([delResident, delUser, delAdmin, delHouse]);
  });

  beforeEach(async () => {
    await prismaClient.user.update({ where: { id: createdUserId }, data: { active: true } });
    await prismaClient.resident.update({ where: { id: createdResidentId }, data: { active: true, deletedAt: null } });
  });

  const auth = () => JSON.stringify({ id: createdAdminId, role: "ADMIN" });

  // ── TEST 1: Desactivar residente → usuario se desactiva ──
  it("PUT /residents/:id active=false debe desactivar el usuario vinculado", async () => {
    const res = await request(app)
      .put(`/api/v1/residents/${createdResidentId}`)
      .set("user", auth())
      .send({ active: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await prismaClient.user.findUnique({ where: { id: createdUserId } });
    expect(user?.active).toBe(false);
  });

  // ── TEST 2: Desactivar usuario RESDN → residente se desactiva ──
  it("PUT /users/:id active=false debe desactivar los residents vinculados", async () => {
    const res = await request(app)
      .put(`/api/v1/users/${createdUserId}`)
      .set("user", auth())
      .send({ active: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const resident = await prismaClient.resident.findUnique({ where: { id: createdResidentId } });
    expect(resident?.active).toBe(false);
  });

  // ── TEST 3: Soft-delete residente → usuario se desactiva ──
  it("DELETE /residents/:id debe desactivar el usuario vinculado", async () => {
    const res = await request(app)
      .delete(`/api/v1/residents/${createdResidentId}`)
      .set("user", auth());

    expect(res.status).toBe(200);

    const user = await prismaClient.user.findUnique({ where: { id: createdUserId } });
    expect(user?.active).toBe(false);

    const resident = await prismaClient.resident.findUnique({ where: { id: createdResidentId } });
    expect(resident?.active).toBe(false);
    expect(resident?.deletedAt).not.toBeNull();
  });
});
