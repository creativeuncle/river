const STORAGE_KEY = "river:visitorId";

// A visitor's only "identity" is a random id kept in their browser — no
// account needed to start chatting from the widget.
export function getVisitorId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
