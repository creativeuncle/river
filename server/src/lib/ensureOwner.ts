import { prisma } from "../prisma.js";

// Every account should have at least one Owner/Admin, or its team gets
// locked out of Team management and widget settings. Normal signup always
// makes the registering agent an Owner, but this self-heals older data (or
// an account whose only Owner/Admin got deleted) by promoting whoever in
// that account registered first.
export async function ensureOwnerExists(): Promise<void> {
  const accounts = await prisma.account.findMany({ select: { id: true } });

  for (const { id: accountId } of accounts) {
    const ownerOrAdminExists = await prisma.agent.count({
      where: { accountId, role: { in: ["Owner", "Admin"] } },
    });
    if (ownerOrAdminExists > 0) continue;

    const earliest = await prisma.agent.findFirst({ where: { accountId }, orderBy: { createdAt: "asc" } });
    if (!earliest) continue;

    await prisma.agent.update({ where: { id: earliest.id }, data: { role: "Owner" } });
    console.log(`No Owner/Admin found for account ${accountId} — promoted "${earliest.name}" (${earliest.email}) to Owner.`);
  }
}
