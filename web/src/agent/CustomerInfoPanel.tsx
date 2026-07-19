import type { Conversation } from "../lib/api";

export function CustomerInfoPanel({
  conversation,
  onAssignToMe,
  onToggleStatus,
}: {
  conversation: Conversation;
  onAssignToMe: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div className="customer-info-panel">
      <h3>Customer</h3>
      <dl>
        <dt>Name</dt>
        <dd>{conversation.visitorName || "Anonymous"}</dd>
        <dt>Email</dt>
        <dd>{conversation.visitorEmail || "—"}</dd>
        <dt>Visitor id</dt>
        <dd className="mono">{conversation.visitorId.slice(0, 12)}…</dd>
        <dt>Status</dt>
        <dd>
          <span className={`status-pill ${conversation.status.toLowerCase()}`}>{conversation.status}</span>
        </dd>
        <dt>Assigned to</dt>
        <dd>{conversation.assignedAgent?.name ?? "Unassigned"}</dd>
      </dl>
      <button onClick={onAssignToMe}>Assign to me</button>
      <button onClick={onToggleStatus}>{conversation.status === "OPEN" ? "Close chat" : "Reopen chat"}</button>
    </div>
  );
}
