export type Source = "TEAMS" | "OUTLOOK" | "CALENDAR";

export function parseSourceParam(s: string): Source | null {
  const up = s.toUpperCase();
  return up === "TEAMS" || up === "OUTLOOK" || up === "CALENDAR" ? (up as Source) : null;
}


