import { useEffect, useState } from "react";
import { fetchReportsSummary, type ReportsSummary } from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  );
}

export function ReportsPage() {
  const { session } = useAgentAuth();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchReportsSummary(session.token, days).then(setSummary);
  }, [session, days]);

  if (!summary) return null;

  const maxDaily = Math.max(1, ...summary.dailyVolume.map((d) => d.count));
  const maxAgentCount = Math.max(1, ...summary.agentChatCounts.map((a) => a.count));
  const maxRatingCount = Math.max(1, ...summary.csat.distribution.map((d) => d.count));

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2>Reports</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="stat-tile-row">
        <StatTile label="Conversations" value={String(summary.totalConversations)} />
        <StatTile label="Avg. response time" value={formatDuration(summary.avgResponseTimeSeconds)} />
        <StatTile label="Avg. resolution time" value={formatDuration(summary.avgResolutionTimeSeconds)} />
        <StatTile
          label="CSAT"
          value={summary.csat.averageRating != null ? `${summary.csat.averageRating} / 5` : "—"}
        />
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <h3>Daily conversation volume</h3>
          <div className="bar-chart">
            {summary.dailyVolume.map((d) => (
              <div className="bar-chart-col" key={d.date} title={`${d.date}: ${d.count}`}>
                <div className="bar-chart-bar" style={{ height: `${(d.count / maxDaily) * 100}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <h3>Chats per agent</h3>
          {summary.agentChatCounts.length === 0 && <p className="muted">No assigned conversations yet.</p>}
          <div className="hbar-list">
            {summary.agentChatCounts.map((a) => (
              <div className="hbar-row" key={a.agentId}>
                <span className="hbar-label">{a.name}</span>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${(a.count / maxAgentCount) * 100}%` }} />
                </div>
                <span className="hbar-count">{a.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <h3>Customer satisfaction</h3>
          {summary.csat.totalRatings === 0 && <p className="muted">No ratings yet.</p>}
          <div className="hbar-list">
            {[...summary.csat.distribution].reverse().map((d) => (
              <div className="hbar-row" key={d.star}>
                <span className="hbar-label">{"★".repeat(d.star)}</span>
                <div className="hbar-track">
                  <div className="hbar-fill csat" style={{ width: `${(d.count / maxRatingCount) * 100}%` }} />
                </div>
                <span className="hbar-count">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
