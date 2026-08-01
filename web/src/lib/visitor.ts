const STORAGE_KEY = "river:visitorId";
const PROFILE_KEY = "river:visitorProfile";

// Identifies which company's widget this is — read from the ?siteId= query
// param the embed snippet passes into the widget-embed iframe (see
// public/widget.js and Account.siteId).
export function getSiteId(): string {
  return new URLSearchParams(window.location.search).get("siteId") ?? "";
}

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

export interface VisitorProfile {
  name: string;
  email: string;
}

// Saved after the pre-chat form so a returning visitor isn't asked again.
export function getVisitorProfile(): VisitorProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as VisitorProfile) : null;
}

export function saveVisitorProfile(profile: VisitorProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
