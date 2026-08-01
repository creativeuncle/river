import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent } from "../middleware/auth.js";

const router = Router();
router.use(requireAgent);

function avgSeconds(diffsMs: number[]): number | null {
  if (diffsMs.length === 0) return null;
  const total = diffsMs.reduce((sum, ms) => sum + ms, 0);
  return Math.round(total / diffsMs.length / 1000);
}

router.get("/summary", async (req, res) => {
  const days = z.coerce.number().int().min(1).max(365).catch(30).parse(req.query.days);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conversations = await prisma.conversation.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      createdAt: true,
      closedAt: true,
      firstAgentReplyAt: true,
      assignedAgentId: true,
      rating: true,
      assignedAgent: { select: { id: true, name: true } },
    },
  });

  const responseTimes = conversations
    .filter((c) => c.firstAgentReplyAt)
    .map((c) => c.firstAgentReplyAt!.getTime() - c.createdAt.getTime());
  const resolutionTimes = conversations
    .filter((c) => c.closedAt)
    .map((c) => c.closedAt!.getTime() - c.createdAt.getTime());

  const agentCounts = new Map<string, { agentId: string; name: string; count: number }>();
  for (const c of conversations) {
    if (!c.assignedAgent) continue;
    const entry = agentCounts.get(c.assignedAgent.id) ?? { agentId: c.assignedAgent.id, name: c.assignedAgent.name, count: 0 };
    entry.count += 1;
    agentCounts.set(c.assignedAgent.id, entry);
  }

  const dailyVolumeMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dailyVolumeMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const c of conversations) {
    const key = c.createdAt.toISOString().slice(0, 10);
    if (dailyVolumeMap.has(key)) dailyVolumeMap.set(key, (dailyVolumeMap.get(key) ?? 0) + 1);
  }

  const ratings = conversations.filter((c) => c.rating != null).map((c) => c.rating!);
  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: ratings.filter((r) => r === star).length,
  }));

  res.json({
    rangeDays: days,
    totalConversations: conversations.length,
    avgResponseTimeSeconds: avgSeconds(responseTimes),
    avgResolutionTimeSeconds: avgSeconds(resolutionTimes),
    agentChatCounts: [...agentCounts.values()].sort((a, b) => b.count - a.count),
    dailyVolume: [...dailyVolumeMap.entries()].map(([date, count]) => ({ date, count })),
    csat: {
      averageRating: ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
      totalRatings: ratings.length,
      distribution: ratingDistribution,
    },
  });
});

export default router;
