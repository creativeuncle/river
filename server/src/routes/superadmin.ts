import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent, requireSuperAdmin } from "../middleware/auth.js";

// Cross-account platform administration — every company/customer on River
// shows up here. Gated by isSuperAdmin, unrelated to any account's own
// Owner/Admin/Agent role (see requireSuperAdmin).
const router = Router();
router.use(requireAgent, requireSuperAdmin);

// No real payment gateway is wired up (see billing.ts) — these are just the
// list prices used to estimate MRR for the Revenue page.
const PLAN_PRICES: Record<string, number> = { Free: 0, Pro: 49, Business: 199 };

router.get("/summary", async (_req, res) => {
  const [accountCount, agentCount, conversationCount, billingRows] = await Promise.all([
    prisma.account.count(),
    prisma.agent.count(),
    prisma.conversation.count(),
    prisma.billingSettings.groupBy({ by: ["plan"], _count: { plan: true } }),
  ]);

  const accountsWithoutBilling = accountCount - billingRows.reduce((sum, r) => sum + r._count.plan, 0);
  const planCounts = new Map<string, number>();
  for (const row of billingRows) planCounts.set(row.plan, row._count.plan);
  if (accountsWithoutBilling > 0) {
    planCounts.set("Free", (planCounts.get("Free") ?? 0) + accountsWithoutBilling);
  }

  const planBreakdown = ["Free", "Pro", "Business"].map((plan) => ({
    plan,
    count: planCounts.get(plan) ?? 0,
    price: PLAN_PRICES[plan],
  }));
  const mrr = planBreakdown.reduce((sum, p) => sum + p.count * p.price, 0);

  res.json({ totalAccounts: accountCount, totalAgents: agentCount, totalConversations: conversationCount, mrr, planBreakdown });
});

router.get("/accounts", async (_req, res) => {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { agents: true, conversations: true } },
      billingSettings: { select: { plan: true, seatLimit: true } },
    },
  });
  res.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      siteId: a.siteId,
      createdAt: a.createdAt,
      agentCount: a._count.agents,
      conversationCount: a._count.conversations,
      plan: a.billingSettings?.plan ?? "Free",
      seatLimit: a.billingSettings?.seatLimit ?? 3,
    })),
  });
});

router.get("/accounts/:id", async (req, res) => {
  const account = await prisma.account.findUnique({
    where: { id: req.params.id },
    include: {
      agents: {
        select: { id: true, name: true, email: true, role: true, createdAt: true, lastSeenAt: true },
        orderBy: { createdAt: "asc" },
      },
      billingSettings: true,
      _count: { select: { conversations: true } },
    },
  });
  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }
  res.json({
    account: {
      id: account.id,
      name: account.name,
      siteId: account.siteId,
      createdAt: account.createdAt,
      agents: account.agents,
      conversationCount: account._count.conversations,
      plan: account.billingSettings?.plan ?? "Free",
      seatLimit: account.billingSettings?.seatLimit ?? 3,
    },
  });
});

const updateBillingSchema = z.object({
  plan: z.enum(["Free", "Pro", "Business"]).optional(),
  seatLimit: z.number().int().min(1).max(1000).optional(),
});

router.patch("/accounts/:id/billing", async (req, res) => {
  const parsed = updateBillingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const account = await prisma.account.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }
  const billing = await prisma.billingSettings.upsert({
    where: { accountId: account.id },
    update: parsed.data,
    create: { accountId: account.id, ...parsed.data },
  });
  res.json({ billing });
});

export default router;
