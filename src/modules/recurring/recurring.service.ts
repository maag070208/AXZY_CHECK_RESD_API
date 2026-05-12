import { prismaClient as prisma } from "@src/core/config/database";

export const getRecurringDataTable = async (body: any) => {
    const { page = 1, limit = 10, filters } = body;
    const { title, search } = filters || {};
    const filterText = search || title || "";

    const where: any = {
        softDelete: false,
        title: { contains: filterText, mode: "insensitive" }
    };

    const [rows, total] = await Promise.all([
        prisma.recurringConfiguration.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                recurringLocations: {
                    include: {
                        location: true,
                        tasks: true
                    }
                },
                guards: true
            }
        }),
        prisma.recurringConfiguration.count({ where }),
    ]);

    return { rows, total };
};

export const createRecurring = async (data: any) => {
    const { title, locations, guardIds } = data;

    return prisma.$transaction(async (tx) => {
        const config = await tx.recurringConfiguration.create({
            data: {
                title,
                guards: {
                    connect: (guardIds || []).map((id: string) => ({ id }))
                }
            }
        });

        const createdLocs = await (tx.recurringLocation as any).createManyAndReturn({
            data: locations.map((loc: any) => ({
                recurringConfigurationId: config.id,
                locationId: loc.locationId as string,
            }))
        });

        const tasksData: any[] = [];
        locations.forEach((loc: any) => {
            if (loc.tasks && loc.tasks.length > 0) {
                const rLoc = createdLocs.find((rl: any) => rl.locationId === (loc.locationId as string));
                if (rLoc) {
                    loc.tasks.forEach((t: any) => {
                        tasksData.push({
                            recurringLocationId: rLoc.id,
                            description: t.description,
                            reqPhoto: t.reqPhoto
                        });
                    });
                }
            }
        });

        if (tasksData.length > 0) {
            await tx.recurringTask.createMany({ data: tasksData });
        }

        return config;
    });
};

export const updateRecurring = async (id: string, data: any) => {
    const { title, locations, guardIds } = data;

    return prisma.$transaction(async (tx) => {
        const oldLocations = await tx.recurringLocation.findMany({
            where: { recurringConfigurationId: id },
            select: { id: true }
        });
        const oldLocIds = oldLocations.map(l => l.id);

        await tx.recurringTask.deleteMany({ where: { recurringLocationId: { in: oldLocIds } } });
        await tx.recurringLocation.deleteMany({ where: { recurringConfigurationId: id } });

        const config = await tx.recurringConfiguration.update({
            where: { id },
            data: {
                title,
                guards: {
                    set: (guardIds || []).map((id: string) => ({ id }))
                }
            }
        });

        const createdLocs = await (tx.recurringLocation as any).createManyAndReturn({
            data: locations.map((loc: any) => ({
                recurringConfigurationId: config.id,
                locationId: loc.locationId as string,
            }))
        });

        const tasksData: any[] = [];
        locations.forEach((loc: any) => {
            if (loc.tasks && loc.tasks.length > 0) {
                const rLoc = createdLocs.find((rl: any) => rl.locationId === (loc.locationId as string));
                if (rLoc) {
                    loc.tasks.forEach((t: any) => {
                        tasksData.push({
                            recurringLocationId: rLoc.id,
                            description: t.description,
                            reqPhoto: t.reqPhoto
                        });
                    });
                }
            }
        });

        if (tasksData.length > 0) {
            await tx.recurringTask.createMany({ data: tasksData });
        }

        return config;
    });
};

export const deleteRecurring = async (id: string) => {
    return prisma.recurringConfiguration.update({
        where: { id },
        data: { softDelete: true, active: false }
    });
};

export const getRecurringById = async (id: string) => {
    return prisma.recurringConfiguration.findUnique({
        where: { id },
        include: {
            recurringLocations: {
                include: {
                    location: true,
                    tasks: true
                }
            },
            guards: true
        }
    });
};

export const getRecurringByGuard = async (guardId: string) => {
    return prisma.recurringConfiguration.findMany({
        where: {
            softDelete: false,
            active: true,
            guards: {
                some: { id: guardId }
            }
        },
        include: {
            recurringLocations: {
                include: {
                    location: true,
                    tasks: true
                }
            },
            guards: true
        }
    });
};

export const getAllRecurring = async () => {
    return prisma.recurringConfiguration.findMany({
        where: {
            softDelete: false,
        },
        include: {
            recurringLocations: {
                include: {
                    location: true,
                    tasks: true
                }
            },
            guards: true
        }
    });
};

