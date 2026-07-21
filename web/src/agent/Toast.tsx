export interface Toast {
  id: string;
  text: string;
  conversationId: string;
  onClick: () => void;
}

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="toast" onClick={t.onClick}>
          <span>{t.text}</span>
          <button
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(t.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
