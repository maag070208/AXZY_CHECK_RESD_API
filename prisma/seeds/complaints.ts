import { PrismaClient, ComplaintStatus } from "@prisma/client";
import { hackerLog } from "./logger";

export const complaintsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("COMPLAINTS", "Seeding complaint categories and sample complaints");

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: "Ruido",            icon: "volume-high",     color: "#F59E0B" },
    { name: "Basura",           icon: "trash-can",       color: "#10B981" },
    { name: "Seguridad",        icon: "shield-alert",    color: "#EF4444" },
    { name: "Infraestructura",  icon: "tools",           color: "#6366F1" },
    { name: "Estacionamiento",  icon: "car-side",        color: "#3B82F6" },
    { name: "Áreas Comunes",    icon: "tree",            color: "#14B8A6" },
    { name: "Mascotas",         icon: "paw",             color: "#8B5CF6" },
    { name: "Vandalismo",       icon: "spray",           color: "#EC4899" },
  ];

  const createdCats: { [name: string]: string } = {};

  for (const cat of categories) {
    const created = await prisma.complaintCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
    createdCats[cat.name] = created.id;
  }

  hackerLog.info("COMPLAINTS", "Creating sample complaints");

  // ── Sample Complaints ─────────────────────────────────────────────────────
  const residents = await prisma.resident.findMany({
    where: { active: true, deletedAt: null },
    take: 10,
  });

  if (residents.length === 0) {
    hackerLog.error("COMPLAINTS", "No residents found");
    return;
  }

  const adminUser = await prisma.user.findUnique({ where: { username: "admin" } });

  const samples = [
    { title: "Ruido excesivo de madrugada",      desc: "El vecino de la casa 203 hace reuniones hasta las 3am con música a volumen alto.", catName: "Ruido",           status: ComplaintStatus.OPEN       },
    { title: "Basura acumulada en la entrada",   desc: "Llevan 3 días sin recoger la basura en la calle Los Olivos.",                     catName: "Basura",          status: ComplaintStatus.IN_PROGRESS},
    { title: "Portón de seguridad dañado",        desc: "El portón principal no cierra correctamente, queda abierto de noche.",            catName: "Seguridad",       status: ComplaintStatus.OPEN       },
    { title: "Bache en la calle principal",       desc: "Hay un bache grande frente a la casa 105 que daña los vehículos.",               catName: "Infraestructura", status: ComplaintStatus.RESOLVED   },
    { title: "Vehículo bloqueando cochera",       desc: "Un carro sin placas bloquea mi cochera desde hace 2 días.",                      catName: "Estacionamiento", status: ComplaintStatus.OPEN       },
    { title: "Alberca en mal estado",             desc: "La alberca comunitaria tiene agua verde y no se ha limpiado en semanas.",         catName: "Áreas Comunes",   status: ComplaintStatus.IN_PROGRESS},
    { title: "Perro suelto atacando vecinos",     desc: "El perro de la casa 302 anda suelto y asustó a varios niños.",                   catName: "Mascotas",        status: ComplaintStatus.OPEN       },
    { title: "Grafiti en barda perimetral",       desc: "Aparecieron pintas en la barda sur del residencial.",                            catName: "Vandalismo",      status: ComplaintStatus.RESOLVED   },
    { title: "Música hasta tarde los viernes",    desc: "Grupo en calle A hace fiesta cada viernes.",                                     catName: "Ruido",           status: ComplaintStatus.CLOSED     },
    { title: "Contenedor de basura roto",         desc: "El contenedor principal está roto y derrama basura.",                            catName: "Basura",          status: ComplaintStatus.OPEN       },
  ];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const resident = residents[i % residents.length];
    const catId = createdCats[s.catName];
    if (!catId) continue;

    const resolvedById = (s.status === ComplaintStatus.RESOLVED || s.status === ComplaintStatus.CLOSED)
      ? adminUser?.id : null;
    const resolvedAt = resolvedById ? new Date() : null;

    await prisma.complaint.create({
      data: {
        residentId: resident.id,
        categoryId: catId,
        title: s.title,
        description: s.desc,
        status: s.status,
        resolvedById,
        resolvedAt,
      },
    });
  }

  const catCount = await prisma.complaintCategory.count();
  const cmpCount = await prisma.complaint.count();
  hackerLog.success("COMPLAINTS", `${catCount} categories, ${cmpCount} complaints seeded`);
};
