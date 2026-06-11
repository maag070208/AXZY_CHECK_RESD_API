import { prismaClient } from "@src/core/config/database";
import { TResult } from '@src/core/dto/TResult';
import { OPERATIONAL_ROLES, ROUND_STATUS_COMPLETED } from "@src/core/config/constants";
import { getStartOfDay, getEndOfDay } from "@src/core/utils/date-time.utils";
import PDFDocument from "pdfkit";

const prisma = prismaClient;

export interface IGuardReportFilters {
    startDate: string;
    endDate: string;
    guardId?: string;
    userRole?: string;
}

const getGuards = (guardId?: string) => {
    return prisma.user.findMany({
        where: {
            role: { name: { in: OPERATIONAL_ROLES } },
            active: true,
            softDelete: false,
            ...(guardId ? { id: guardId } : {}),
        },
        select: { id: true, name: true, lastName: true, role: true }
    });
};

export const getGuardGeneralStats = async (filters: IGuardReportFilters): Promise<TResult<any>> => {
    try {
        const { startDate, endDate, guardId } = filters;
        const start = getStartOfDay(startDate);
        const end = getEndOfDay(endDate);

        const [incidentCount, maintenanceCount, scans, rounds] = await Promise.all([
            prisma.incident.count({
                where: {
                    ...(guardId ? { guardId } : {}),
                    createdAt: { gte: start, lte: end }
                }
            }),
            prisma.maintenance.count({
                where: {
                    ...(guardId ? { guardId } : {}),
                    createdAt: { gte: start, lte: end }
                }
            }),
            prisma.kardex.count({
                where: {
                    ...(guardId ? { userId: guardId } : {}),
                    timestamp: { gte: start, lte: end }
                }
            }),
            prisma.round.findMany({
                where: {
                    ...(guardId ? { guardId } : {}),
                    startTime: { gte: start, lte: end }
                },
                include: {
                    recurringConfiguration: {
                        include: {
                            recurringLocations: true
                        }
                    }
                }
            })
        ]);

        const allKardex = await prisma.kardex.findMany({
            where: {
                ...(guardId ? { userId: guardId } : {}),
                timestamp: { gte: start, lte: end }
            },
            select: { userId: true, timestamp: true, locationId: true }
        });

        let missedScansCount = 0;
        let incompleteRoundsCount = 0;

        for (const round of rounds) {
            const config = round.recurringConfiguration;
            if (config) {
                const roundEnd = round.endTime || new Date();
                const configLocationIds = config.recurringLocations.map(l => l.locationId);
                
                const scannedCount = allKardex.filter(k => 
                    k.userId === round.guardId && 
                    k.timestamp >= round.startTime && 
                    k.timestamp <= roundEnd &&
                    configLocationIds.includes(k.locationId)
                ).length;
                
                const required = configLocationIds.length;
                const missedInThisRound = Math.max(0, required - scannedCount);
                missedScansCount += missedInThisRound;

                if (missedInThisRound > 0 && round.status === ROUND_STATUS_COMPLETED) {
                    incompleteRoundsCount++;
                }
            }
        }

        return {
            success: true,
            data: {
                totalIncidents: incidentCount + maintenanceCount,
                totalScans: scans,
                incompleteRounds: incompleteRoundsCount,
                missedScans: missedScansCount
            },
            messages: []
        };
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getTopPerformanceGuards = async (filters: IGuardReportFilters): Promise<TResult<any>> => {
    try {
        const { startDate, endDate } = filters;
        const start = getStartOfDay(startDate);
        const end = getEndOfDay(endDate);

        const groupData = await prisma.kardex.groupBy({
            by: ['userId'],
            where: {
                timestamp: { gte: start, lte: end },
                user: { role: { name: { in: OPERATIONAL_ROLES } } },
            },
            _count: { _all: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 5
        });

        const guardIds = groupData.map(g => g.userId);
        const guards = await prisma.user.findMany({
            where: { id: { in: guardIds } },
            select: { id: true, name: true, lastName: true }
        });

        const result = groupData.map(g => {
            const guard = guards.find(u => u.id === g.userId);
            return {
                guardId: g.userId,
                name: guard?.name || 'Unknown',
                lastName: guard?.lastName || '',
                totalScans: (g as any)._count?._all || (g as any)._count?.userId || 0
            };
        });

        return { success: true, data: result, messages: [] };
    } catch (error: any) {
        return { success: false, data: [], messages: [error.message] };
    }
};

export const getWorkloadComparison = async (filters: IGuardReportFilters): Promise<TResult<any>> => {
    try {
        const { startDate, endDate } = filters;
        const start = getStartOfDay(startDate);
        const end = getEndOfDay(endDate);

        const guards = await getGuards(undefined);
        const guardIds = guards.map(g => g.id);

        const [scans, incidents, maintenances, rounds] = await Promise.all([
            prisma.kardex.groupBy({
                by: ['userId'],
                where: { 
                    userId: { in: guardIds }, 
                    timestamp: { gte: start, lte: end },
                },
                _count: { _all: true }
            }),
            prisma.incident.groupBy({
                by: ['guardId'],
                where: { 
                    guardId: { in: guardIds }, 
                    createdAt: { gte: start, lte: end },
                },
                _count: { _all: true }
            }),
            prisma.maintenance.groupBy({
                by: ['guardId'],
                where: { 
                    guardId: { in: guardIds }, 
                    createdAt: { gte: start, lte: end },
                },
                _count: { _all: true }
            }),
            prisma.round.groupBy({
                by: ['guardId'],
                where: { 
                    guardId: { in: guardIds }, 
                    startTime: { gte: start, lte: end },
                },
                _count: { _all: true }
            })
        ]);

        const result = guards.map(guard => {
            const scanCount = scans.find(s => s.userId === guard.id)?._count?._all || 0;
            const incCount = incidents.find(i => i.guardId === guard.id)?._count?._all || 0;
            const maintCount = maintenances.find(m => m.guardId === guard.id)?._count?._all || 0;
            const roundCount = rounds.find(r => r.guardId === guard.id)?._count?._all || 0;

            const workload = (scanCount * 1) + (incCount * 5) + (maintCount * 5) + (roundCount * 10);

            return {
                guardId: guard.id,
                name: guard.name,
                lastName: guard.lastName,
                role: guard.role?.value || '---',
                workload,
                details: { scans: scanCount, reports: incCount + maintCount, rounds: roundCount }
            };
        }).sort((a, b) => b.workload - a.workload);

        return { success: true, data: result, messages: [] };
    } catch (error: any) {
        return { success: false, data: [], messages: [error.message] };
    }
};

export const getActivityDistribution = async (filters: IGuardReportFilters): Promise<TResult<any>> => {
    try {
        const { startDate, endDate, guardId } = filters;
        const start = getStartOfDay(startDate);
        const end = getEndOfDay(endDate);

        const guards = await getGuards(guardId);
        const guardIds = guards.map(g => g.id);

        const [scans, incidents, maintenances, rounds] = await Promise.all([
            prisma.kardex.groupBy({
                by: ['userId'],
                where: { 
                    userId: { in: guardIds }, 
                    timestamp: { gte: start, lte: end },
                },
                _count: { _all: true }
            }),
            prisma.incident.groupBy({
                by: ['guardId'],
                where: { 
                    guardId: { in: guardIds }, 
                    createdAt: { gte: start, lte: end },
                },
                _count: { _all: true }
            }),
            prisma.maintenance.groupBy({
                by: ['guardId'],
                where: { 
                    guardId: { in: guardIds }, 
                    createdAt: { gte: start, lte: end },
                },
                _count: { _all: true }
            }),
            prisma.round.groupBy({
                by: ['guardId'],
                where: { 
                    guardId: { in: guardIds }, 
                    startTime: { gte: start, lte: end },
                },
                _count: { _all: true }
            })
        ]);

        const result = guards.map(guard => {
            const scanCount = scans.find(s => s.userId === guard.id)?._count?._all || 0;
            const incCount = incidents.find(i => i.guardId === guard.id)?._count?._all || 0;
            const maintCount = maintenances.find(m => m.guardId === guard.id)?._count?._all || 0;
            const roundCount = rounds.find(r => r.guardId === guard.id)?._count?._all || 0;

            return {
                guardId: guard.id,
                name: guard.name,
                lastName: guard.lastName,
                role: guard.role?.value || '---',
                scans: scanCount,
                incidents: incCount,
                maintenances: maintCount,
                rounds: roundCount,
                total: scanCount + incCount + maintCount + roundCount
            };
        });

        return { success: true, data: result, messages: [] };
    } catch (error: any) {
        return { success: false, data: [], messages: [error.message] };
    }
};

export const getGuardDetailedReport = async (filters: IGuardReportFilters): Promise<TResult<any>> => {
    try {
        const { startDate, endDate, guardId } = filters;
        const start = getStartOfDay(startDate);
        const end = getEndOfDay(endDate);

        const guards = await getGuards(guardId);
        const guardIds = guards.map(g => g.id);

        const [scansGroupBy, allRounds, allKardex] = await Promise.all([
            prisma.kardex.groupBy({
                by: ['userId'],
                where: { 
                    userId: { in: guardIds }, 
                    timestamp: { gte: start, lte: end },
                },
                _count: { _all: true }
            }),
            prisma.round.findMany({
                where: { 
                    guardId: { in: guardIds }, 
                    startTime: { gte: start, lte: end },
                },
                include: { recurringConfiguration: { include: { recurringLocations: true } } }
            }),
            prisma.kardex.findMany({
                where: { 
                    userId: { in: guardIds }, 
                    timestamp: { gte: start, lte: end },
                },
                select: { userId: true, timestamp: true, locationId: true }
            })
        ]);

        const reportData = guards.map(guard => {
            const guardRounds = allRounds.filter(r => r.guardId === guard.id);
            const guardScansCount = (scansGroupBy.find(s => s.userId === guard.id) as any)?._count?._all || 0;
            const guardKardex = allKardex.filter(k => k.userId === guard.id);

            let totalRoundDurationMs = 0;
            let completedRoundsCount = 0;
            let missedScansCount = 0;
            let incompleteRoundsCount = 0;

            for (const round of guardRounds) {
                if (round.status === ROUND_STATUS_COMPLETED && round.endTime) {
                    totalRoundDurationMs += (round.endTime.getTime() - round.startTime.getTime());
                    completedRoundsCount++;
                }

                const config = round.recurringConfiguration;
                if (config) {
                    const roundEnd = round.endTime || new Date();
                    const configIds = config.recurringLocations.map((rl: any) => rl.locationId);
                    
                    const scannedInRound = guardKardex.filter(k => 
                        k.timestamp >= round.startTime && 
                        k.timestamp <= roundEnd &&
                        configIds.includes(k.locationId)
                    ).length;

                    const required = configIds.length;
                    const missedInRound = Math.max(0, required - scannedInRound);
                    missedScansCount += missedInRound;

                    if (missedInRound > 0 && round.status === ROUND_STATUS_COMPLETED) {
                        incompleteRoundsCount++;
                    }
                }
            }

            const avgRoundTimeMinutes = completedRoundsCount > 0 
                ? (totalRoundDurationMs / completedRoundsCount) / (1000 * 60)
                : 0;

            return {
                guardId: guard.id,
                name: guard.name,
                lastName: guard.lastName,
                role: guard.role?.value || '---',
                totalRounds: guardRounds.length,
                totalScans: guardScansCount,
                incompleteRounds: incompleteRoundsCount,
                missedScans: missedScansCount,
                avgRoundTimeMinutes: Math.round(avgRoundTimeMinutes * 100) / 100
            };
        });

        return { success: true, data: reportData, messages: [] };
    } catch (error: any) {
        return { success: false, data: [], messages: [error.message] };
    }
};

export const getGuardDetailBreakdown = async (filters: IGuardReportFilters): Promise<TResult<any>> => {
    try {
        const { startDate, endDate, guardId } = filters;
        if (!guardId) throw new Error("GuardId is required");

        const start = getStartOfDay(startDate);
        const end = getEndOfDay(endDate);

        const [rounds, allKardex] = await Promise.all([
            prisma.round.findMany({
                where: { 
                    guardId, 
                    startTime: { gte: start, lte: end },
                },
                include: { recurringConfiguration: { include: { recurringLocations: { include: { location: true } } } } }
            }),
            prisma.kardex.findMany({
                where: { 
                    userId: guardId, 
                    timestamp: { gte: start, lte: end },
                },
                select: { locationId: true, timestamp: true }
            })
        ]);

        const missedPoints: any[] = [];
        const incompleteRounds: any[] = [];

        for (const round of rounds) {
            const config = round.recurringConfiguration;
            if (!config) continue;

            const roundEnd = round.endTime || new Date();
            const scannedIds = new Set(
                allKardex
                    .filter(k => k.timestamp >= round.startTime && k.timestamp <= roundEnd)
                    .map(k => k.locationId)
            );

            const roundMissed = config.recurringLocations.filter((rl: any) => !scannedIds.has(rl.locationId));

            if (roundMissed.length > 0) {
                if (round.status === ROUND_STATUS_COMPLETED) {
                    incompleteRounds.push({
                        roundId: round.id,
                        startTime: round.startTime,
                        endTime: round.endTime,
                        missedCount: roundMissed.length,
                        totalLocations: config.recurringLocations.length
                    });
                }

                roundMissed.forEach((rl: any) => {
                    missedPoints.push({
                        roundId: round.id,
                        startTime: round.startTime,
                        locationId: rl.locationId,
                        locationName: rl.location?.name || "Ubicación",
                        aisle: rl.location?.aisle
                    });
                });
            }
        }

        return { success: true, data: { missedPoints, incompleteRounds }, messages: [] };
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export interface IPaymentReportParams {
    from: string;
    to: string;
    residentId?: string;
    houseId?: string;
    status?: string;
}

export interface IIncidentsComplaintsReportParams {
    from: string;
    to: string;
    categoryId?: string;
    status?: string;
}

export const getPaymentReport = async (params: IPaymentReportParams): Promise<TResult<any>> => {
    try {
        const { from, to, residentId, houseId, status } = params;
        const start = getStartOfDay(from);
        const end = getEndOfDay(to);

        const where: any = { deletedAt: null };
        if (status) where.status = status;
        if (residentId) where.residentId = residentId;
        if (houseId) where.resident = { houseId };

        const payments = await prisma.payment.findMany({
            where: {
                ...where,
                createdAt: { gte: start, lte: end },
            },
            select: {
                id: true,
                amount: true,
                status: true,
                period: true,
                paidAt: true,
                createdAt: true,
                resident: {
                    select: {
                        id: true,
                        user: { select: { name: true, lastName: true } },
                        house: { select: { number: true, street: true } },
                    },
                },
                fee: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const summary = {
            totalCount: payments.length,
            totalAmount: payments.reduce((acc, p) => acc + Number(p.amount), 0),
            paidCount: payments.filter(p => p.status === "PAID").length,
            paidAmount: payments.filter(p => p.status === "PAID").reduce((acc, p) => acc + Number(p.amount), 0),
            pendingCount: payments.filter(p => p.status === "PENDING").length,
            pendingAmount: payments.filter(p => p.status === "PENDING").reduce((acc, p) => acc + Number(p.amount), 0),
        };

        const rows = payments.map(p => ({
            id: p.id,
            residentName: `${p.resident?.user?.name || ""} ${p.resident?.user?.lastName || ""}`.trim(),
            house: p.resident?.house ? `${p.resident.house.street} ${p.resident.house.number}` : "-",
            feeName: p.fee?.name || "Cargo único",
            amount: Number(p.amount),
            period: p.period,
            status: p.status,
            paidAt: p.paidAt?.toISOString() || null,
            createdAt: p.createdAt.toISOString(),
        }));

        return { success: true, data: { summary, rows }, messages: [] };
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getPaymentReportPDF = async (params: IPaymentReportParams): Promise<Buffer> => {
    const result = await getPaymentReport(params);
    if (!result.success || !result.data) throw new Error("Error generando reporte");
    return generatePaymentReportPDFBuffer(params.from, params.to, result.data.summary, result.data.rows);
};

export const getIncidentsComplaintsReport = async (params: IIncidentsComplaintsReportParams): Promise<TResult<any>> => {
    try {
        const { from, to, categoryId, status } = params;
        const start = getStartOfDay(from);
        const end = getEndOfDay(to);

        const incidentWhere: any = { deletedAt: null, createdAt: { gte: start, lte: end } };
        if (status === "PENDING") incidentWhere.status = "PENDING";
        else if (status === "ATTENDED") incidentWhere.status = "ATTENDED";

        const complaintWhere: any = { deletedAt: null, createdAt: { gte: start, lte: end } };
        if (status === "OPEN") complaintWhere.status = "OPEN";
        else if (status === "IN_PROGRESS") complaintWhere.status = "IN_PROGRESS";
        else if (status === "RESOLVED") complaintWhere.status = "RESOLVED";
        else if (status === "CLOSED") complaintWhere.status = "CLOSED";
        if (categoryId) complaintWhere.categoryId = categoryId;

        const [incidents, complaints] = await Promise.all([
            prisma.incident.findMany({
                where: incidentWhere,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    createdAt: true,
                    resolvedAt: true,
                    category: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.complaint.findMany({
                where: complaintWhere,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    createdAt: true,
                    resolvedAt: true,
                    category: { select: { name: true } },
                    resident: {
                        select: { user: { select: { name: true, lastName: true } } },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const incidentRows = incidents.map(i => ({
            id: i.id,
            type: "INCIDENT" as const,
            title: i.title,
            category: i.category?.name || "Sin categoría",
            reportedBy: "Guardia",
            status: i.status,
            createdAt: i.createdAt.toISOString(),
            resolvedAt: i.resolvedAt?.toISOString() || null,
            resolutionHours: i.resolvedAt
                ? Math.round((i.resolvedAt.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60) * 100) / 100
                : null,
        }));

        const complaintRows = complaints.map(c => ({
            id: c.id,
            type: "COMPLAINT" as const,
            title: c.title,
            category: c.category?.name || "Sin categoría",
            reportedBy: `${c.resident?.user?.name || ""} ${c.resident?.user?.lastName || ""}`.trim(),
            status: c.status,
            createdAt: c.createdAt.toISOString(),
            resolvedAt: c.resolvedAt?.toISOString() || null,
            resolutionHours: c.resolvedAt
                ? Math.round((c.resolvedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60) * 100) / 100
                : null,
        }));

        const allRows = [...incidentRows, ...complaintRows].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const openStatuses = ["PENDING", "OPEN", "IN_PROGRESS"];
        const resolvedStatuses = ["ATTENDED", "RESOLVED", "CLOSED"];

        const summary = {
            totalIncidents: incidents.length,
            totalComplaints: complaints.length,
            totalCount: allRows.length,
            openCount: allRows.filter(r => openStatuses.includes(r.status)).length,
            resolvedCount: allRows.filter(r => resolvedStatuses.includes(r.status)).length,
            avgResolutionHours: allRows
                .filter(r => r.resolutionHours !== null)
                .reduce((acc, r, _, arr) => acc + (r.resolutionHours || 0) / arr.length, 0),
        };

        return { success: true, data: { summary, rows: allRows }, messages: [] };
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getIncidentsComplaintsReportPDF = async (params: IIncidentsComplaintsReportParams): Promise<Buffer> => {
    const result = await getIncidentsComplaintsReport(params);
    if (!result.success || !result.data) throw new Error("Error generando reporte");
    return generateIncidentsComplaintsReportPDFBuffer(params.from, params.to, result.data.summary, result.data.rows);
};

// Configuración de constantes para PDF
const C = {
    S900: "#0f172a",
    S700: "#334155",
    S600: "#475569",
    S500: "#64748b",
    S400: "#94a3b8",
    S200: "#e2e8f0",
    S100: "#f1f5f9",
    S50: "#f8fafc",
    W: "#ffffff",
    G: "#16a34a",
    G50: "#f0fdf4",
    A: "#d97706",
    A50: "#fffbeb",
};

const M = 40;
const PW = 842;
const PH = 595;
const CW = PW - M * 2;

// Función nextPage corregida
function nextPage(doc: PDFKit.PDFDocument, y: number, need: number): number {
    if (y + need > PH - M) {
        doc.addPage();
        return M;
    }
    return y;
}

// Función drawTopBar mejorada
function drawTopBar(doc: PDFKit.PDFDocument, title: string, from: string, to: string) {
    doc.rect(0, 0, PW, 6).fill(C.S900);
    doc.fillColor(C.S900).fontSize(14).font("Helvetica-Bold").text(title, M, 20, { width: CW, align: "left" });
    doc.fontSize(8).font("Helvetica").fillColor(C.S500).text(`${from}  —  ${to}`, M, 38, { width: CW, align: "left" });
    doc.moveTo(M, 52).lineTo(M + CW, 52).lineWidth(0.5).stroke(C.S200);
}

// Función drawKpi mejorada
function drawKpi(doc: PDFKit.PDFDocument, x: number, y: number, w: number, label: string, value: string, sub: string, accent: string) {
    doc.save();
    doc.roundedRect(x, y, w, 52, 6).fill(C.W);
    doc.roundedRect(x, y, w, 52, 6).lineWidth(1.5).stroke(accent);
    doc.fontSize(6).font("Helvetica-Bold").fillColor(C.S500).text(label, x + 12, y + 8, { width: w - 24 });
    doc.fontSize(15).font("Helvetica-Bold").fillColor(C.S900).text(value, x + 12, y + 20, { width: w - 24 });
    if (sub && sub.trim()) {
        doc.fontSize(6).font("Helvetica").fillColor(C.S400).text(sub, x + 12, y + 38, { width: w - 24 });
    }
    doc.restore();
}

// Función drawDonut mejorada
function drawDonut(doc: PDFKit.PDFDocument, cx: number, cy: number, outerR: number, innerR: number, segments: { pct: number; color: string }[]) {
    doc.save();
    let startAngle = 0;
    segments.forEach(seg => {
        if (seg.pct <= 0) return;
        const sweepAngle = seg.pct * Math.PI * 2;
        for (let i = 0; i <= 40; i++) {
            const angle = startAngle + (i / 40) * sweepAngle;
            const x1 = cx + Math.cos(angle) * innerR;
            const y1 = cy + Math.sin(angle) * innerR;
            const x2 = cx + Math.cos(angle) * outerR;
            const y2 = cy + Math.sin(angle) * outerR;
            
            if (i === 0) {
                doc.moveTo(x1, y1);
            } else {
                doc.lineTo(x1, y1);
            }
            doc.lineTo(x2, y2);
        }
        doc.fill(seg.color);
        startAngle += sweepAngle;
    });
    doc.circle(cx, cy, innerR).fill(C.W);
    doc.circle(cx, cy, innerR).lineWidth(0.5).stroke(C.S200);
    doc.circle(cx, cy, outerR).lineWidth(0.5).stroke(C.S200);
    doc.restore();
}

// Función drawHBar mejorada
function drawHBar(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, pct: number) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(C.S600).text(label, x, y + 3, { width: 75 });
    doc.fontSize(7).font("Helvetica").fillColor(C.S900).text(value, x + 80, y + 3, { width: 60, align: "right" });
    const bx = x + 145;
    const bw = CW - 260;
    if (bw > 0) {
        doc.roundedRect(bx, y, bw, 16, 4).fill(C.S100);
        if (pct > 0 && pct <= 1) {
            const fw = Math.max(bw * pct, 30);
            doc.roundedRect(bx, y, fw, 16, 4).fill(C.G);
            doc.fontSize(7).font("Helvetica-Bold").fillColor(C.W)
                .text(`${Math.round(pct * 100)}%`, bx + 8, y + 3, { width: fw - 16 });
        }
    }
}

// Función tableCenterX corregida
function tableCenterX(cols: number[]): number {
    const tw = cols.reduce((s, c) => s + c, 0);
    return Math.max(M, M + (CW - tw) / 2);
}

// Función cellX corregida
function cellX(cols: number[], i: number, tx: number): number {
    let sum = tx;
    for (let j = 0; j < i; j++) {
        sum += cols[j];
    }
    return sum;
}

// Función drawTableHeader mejorada
function drawTableHeader(doc: PDFKit.PDFDocument, y: number, cols: number[], headers: string[], tx: number) {
    const tw = cols.reduce((s, c) => s + c, 0);
    doc.rect(tx, y, tw, 20).fill(C.S100);
    doc.fontSize(6).font("Helvetica-Bold").fillColor(C.S500);
    headers.forEach((h, i) => {
        const cx = cellX(cols, i, tx);
        doc.text(h, cx + 6, y + 5, { width: cols[i] - 12, align: "center" });
    });
}

// Función drawRow mejorada
function drawRow(doc: PDFKit.PDFDocument, y: number, cols: number[], cells: string[], stripe: boolean, tx: number) {
    const tw = cols.reduce((s, c) => s + c, 0);
    if (stripe) {
        doc.rect(tx, y - 1, tw, 17).fill(C.S50);
    }
    doc.fontSize(7).font("Helvetica").fillColor(C.S700);
    cells.forEach((cell, i) => {
        const cx = cellX(cols, i, tx);
        doc.text(cell || "-", cx + 6, y + 3, { width: cols[i] - 12, ellipsis: true });
    });
}

// Función redrawTableHeader corregida
function redrawTableHeader(doc: PDFKit.PDFDocument, title: string, from: string, to: string, cols: number[], headers: string[], tx: number): number {
    drawTopBar(doc, title, from, to);
    const headerY = M + 80;
    drawTableHeader(doc, headerY, cols, headers, tx);
    return headerY + 22;
}

// Función drawFooter mejorada
function drawFooter(doc: PDFKit.PDFDocument) {
    const footerY = PH - 50;
    doc.moveTo(M, footerY).lineTo(M + CW, footerY).lineWidth(0.5).stroke(C.S200);
    doc.fillColor(C.S400).fontSize(6).font("Helvetica")
        .text("AXZY CHECK — Sistema de Administración Residencial", M, footerY + 8, { width: CW, align: "center" });
    const d = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
    doc.fontSize(5).fillColor(C.S400)
        .text(`Generado el ${d}`, M, footerY + 20, { width: CW, align: "center" });
}

// Función generatePaymentReportPDFBuffer mejorada
function generatePaymentReportPDFBuffer(
    from: string, to: string,
    summary: any, rows: any[]
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ margin: M, size: [PW, PH], layout: "landscape" });
        doc.on("data", (c: Uint8Array) => chunks.push(Buffer.from(c)));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        drawTopBar(doc, "Reporte de Cobranza", from, to);

        const cardW = (CW - 16) / 3;
        const cy = 66;
        drawKpi(doc, M, cy, cardW, "COBRADO", `$${summary.paidAmount.toFixed(2)}`, `${summary.paidCount} pagos`, C.G);
        drawKpi(doc, M + cardW + 8, cy, cardW, "PENDIENTE", `$${summary.pendingAmount.toFixed(2)}`, `${summary.pendingCount} pagos`, C.A);
        drawKpi(doc, M + (cardW + 8) * 2, cy, cardW, "TOTAL", `$${summary.totalAmount.toFixed(2)}`, `${summary.totalCount} registros`, C.S600);

        const by = cy + 66;
        const paidPct = summary.totalAmount > 0 ? summary.paidAmount / summary.totalAmount : 0;
        const pendingPct = summary.totalAmount > 0 ? summary.pendingAmount / summary.totalAmount : 0;

        doc.fontSize(8).font("Helvetica-Bold").fillColor(C.S700).text("Distribución de Pagos", M, by);
        drawHBar(doc, M, by + 18, "Pagado", `$${summary.paidAmount.toFixed(2)}`, paidPct);
        drawHBar(doc, M, by + 38, "Pendiente", `$${summary.pendingAmount.toFixed(2)}`, pendingPct);

        const dcx = M + CW - 120;
        const dcy = by + 35;
        drawDonut(doc, dcx, dcy, 65, 40, [
            { pct: paidPct, color: C.G },
            { pct: pendingPct, color: C.A },
        ]);

        doc.fontSize(10).font("Helvetica-Bold").fillColor(C.G).text(
            `${Math.round(paidPct * 100)}%`, dcx - 25, dcy - 6, { width: 50, align: "center" }
        );
        doc.fontSize(5).font("Helvetica").fillColor(C.S500).text(
            "Pagado", dcx - 25, dcy + 8, { width: 50, align: "center" }
        );

        const cols = [150, 100, 90, 75, 75, 80, 80];
        const headers = ["Residente", "Casa", "Cuota", "Monto", "Período", "Estado", "Fecha Pago"];
        const tx = tableCenterX(cols);
        let y = by + 80;

        drawTableHeader(doc, y, cols, headers, tx);
        y += 22;

        rows.forEach((row, idx) => {
            const newY = nextPage(doc, y, 17);
            if (newY === M) {
                y = redrawTableHeader(doc, "Reporte de Cobranza (cont.)", from, to, cols, headers, tx);
            } else {
                y = newY;
            }
            const statusLabel = row.status === "PAID" ? "Pagado" : "Pendiente";
            drawRow(doc, y, cols, [
                row.residentName,
                row.house,
                row.feeName,
                `$${Number(row.amount).toFixed(2)}`,
                row.period,
                statusLabel,
                row.paidAt ? new Date(row.paidAt).toLocaleDateString("es-MX") : "-",
            ], idx % 2 === 0, tx);
            y += 17;
        });

        drawFooter(doc);
        doc.end();
    });
}

// Función generateIncidentsComplaintsReportPDFBuffer mejorada
function generateIncidentsComplaintsReportPDFBuffer(
    from: string, to: string,
    summary: any, rows: any[]
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ margin: M, size: [PW, PH], layout: "landscape" });
        doc.on("data", (c: Uint8Array) => chunks.push(Buffer.from(c)));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        drawTopBar(doc, "Reporte de Incidencias y Quejas", from, to);

        const cardW = (CW - 30) / 4;
        const cy = 66;
        drawKpi(doc, M, cy, cardW, "INCIDENCIAS", String(summary.totalIncidents), "", C.S700);
        drawKpi(doc, M + cardW + 10, cy, cardW, "QUEJAS", String(summary.totalComplaints), "", C.S600);
        drawKpi(doc, M + (cardW + 10) * 2, cy, cardW, "ABIERTAS", String(summary.openCount), "", C.A);
        drawKpi(doc, M + (cardW + 10) * 3, cy, cardW, "CERRADAS", String(summary.resolvedCount), "", C.G);

        const by = cy + 64;
        const inc = summary.totalIncidents || 0;
        const cmp = summary.totalComplaints || 0;
        const maxC1 = Math.max(inc, cmp, 1);
        const halfW = (CW - 20) / 2;

        doc.fontSize(8).font("Helvetica-Bold").fillColor(C.S700).text("Volumen", M, by);
        drawHBar(doc, M, by + 18, "Incidencias", String(inc), inc / maxC1);
        drawHBar(doc, M, by + 38, "Quejas", String(cmp), cmp / maxC1);

        const opn = summary.openCount || 0;
        const cls = summary.resolvedCount || 0;
        const maxC2 = Math.max(opn, cls, 1);
        const rx = M + halfW + 20;

        doc.fontSize(8).font("Helvetica-Bold").fillColor(C.S700).text("Resolución", rx, by);
        drawHBar(doc, rx, by + 18, "Abiertas", String(opn), opn / maxC2);
        drawHBar(doc, rx, by + 38, "Cerradas", String(cls), cls / maxC2);

        const totalRecords = Math.max(summary.totalCount || 1, 1);
        const dcx = M + CW - 120;
        const dcy = by + 5;
        drawDonut(doc, dcx, dcy, 65, 40, [
            { pct: (inc + cmp) / totalRecords, color: C.S700 },
            { pct: Math.max(0, (totalRecords - inc - cmp) / totalRecords), color: C.S100 },
        ]);

        doc.fontSize(10).font("Helvetica-Bold").fillColor(C.S700).text(
            `${inc + cmp}`, dcx - 25, dcy - 6, { width: 50, align: "center" }
        );
        doc.fontSize(5).font("Helvetica").fillColor(C.S500).text(
            "Total", dcx - 25, dcy + 8, { width: 50, align: "center" }
        );

        const tmy = by + 62;
        doc.roundedRect(M, tmy, CW, 28, 6).fill(C.S50);
        doc.roundedRect(M, tmy, CW, 28, 6).lineWidth(0.5).stroke(C.S200);
        doc.fontSize(7).font("Helvetica-Bold").fillColor(C.S500).text("TIEMPO PROMEDIO DE RESOLUCIÓN", M + 12, tmy + 6);
        doc.fontSize(9).font("Helvetica-Bold").fillColor(C.S900).text(`${Math.round(summary.avgResolutionHours)} hrs`, M + CW - 80, tmy + 5, { width: 70, align: "right" });

        const cols = [65, 150, 80, 105, 80, 80, 80];
        const headers = ["Tipo", "Asunto", "Categoría", "Reportado por", "Estado", "Creado", "Resolución"];
        const tx = tableCenterX(cols);
        let y = tmy + 44;

        drawTableHeader(doc, y, cols, headers, tx);
        y += 22;

        const statusMap: Record<string, string> = {
            PENDING: "Pendiente", ATTENDED: "Atendida",
            OPEN: "Abierta", IN_PROGRESS: "En Proceso", RESOLVED: "Resuelta", CLOSED: "Cerrada",
        };

        rows.forEach((row, idx) => {
            const newY = nextPage(doc, y, 17);
            if (newY === M) {
                y = redrawTableHeader(doc, "Reporte Incidencias y Quejas (cont.)", from, to, cols, headers, tx);
            } else {
                y = newY;
            }
            drawRow(doc, y, cols, [
                row.type === "INCIDENT" ? "Incidencia" : "Queja",
                row.title,
                row.category,
                row.reportedBy,
                statusMap[row.status] || row.status,
                new Date(row.createdAt).toLocaleDateString("es-MX"),
                row.resolvedAt ? new Date(row.resolvedAt).toLocaleDateString("es-MX") : "-",
            ], idx % 2 === 0, tx);
            y += 17;
        });

        drawFooter(doc);
        doc.end();
    });
}