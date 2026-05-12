import { prismaClient as prisma } from "@src/core/config/database";

export const getZonesDataTable = async (body: any) => {
    const { filters } = body;
    const search = filters?.search;

    const where: any = {
        softDelete: false,
        active: true
    };

    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
    }

    const rows = await prisma.zone.findMany({
        where,
        orderBy: { id: "desc" }
    });

    return { rows, total: rows.length };
};

export const getZones = async () => {
    return prisma.zone.findMany({
        where: { softDelete: false, active: true },
        orderBy: { id: "desc" }
    });
};

export const createZone = async (data: { name: string }) => {
    return prisma.zone.create({
        data
    });
};

export const updateZone = async (id: string, data: { name?: string; active?: boolean }) => {
    return prisma.zone.update({
        where: { id },
        data
    });
};

export const deleteZone = async (id: string) => {
    return prisma.zone.update({
        where: { id },
        data: { softDelete: true, active: false }
    });
};
