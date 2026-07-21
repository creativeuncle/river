import { prisma } from "../prisma.js";

// Installs that existed before roles were added (or where the Owner was
// deleted) would otherwise have no Owner/Admin at all, locking everyone out
// of Team management and widget settings. Self-heal by promoting whoever
// registered first.
export async function ensureOwnerExists(): Promise<void> {
  const ownerOrAdminExists = await prisma.agent.count({ where: { role: { in: ["Owner", "Admin"] } } });
  if (ownerOrAdminExists > 0) return;

  const earliest = await prisma.agent.findFirst({ orderBy: { createdAt: "asc" } });
  if (!earliest) return;

  await prisma.agent.update({ where: { id: earliest.id }, data: { role: "Owner" } });
  console.log(`No Owner/Admin found — promoted "${earliest.name}" (${earliest.email}) to Owner.`);
}
