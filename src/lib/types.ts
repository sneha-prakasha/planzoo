export type Status = "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  color: string;
  created_at: string;
}

export interface Member {
  project_id: string;
  user_id: string;
  role: "owner" | "member";
  profiles: Profile | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
}

export interface CommentRow {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
}

export interface Invite {
  id: string;
  project_id: string;
  email: string;
  created_at: string;
}

export interface ActivityRow {
  id: string;
  project_id: string;
  user_id: string;
  action: "created" | "moved" | "assigned" | "commented";
  task_title: string;
  detail: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
}

export const STATUSES: { id: Status; label: string; color: string }[] = [
  { id: "todo", label: "To do", color: "#94a3b8" },
  { id: "in_progress", label: "In progress", color: "#3b82f6" },
  { id: "review", label: "In review", color: "#f59e0b" },
  { id: "done", label: "Done", color: "#10b981" },
];

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export const PROJECT_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

export function statusLabel(s: string): string {
  return STATUSES.find((x) => x.id === s)?.label ?? s;
}

export function displayName(p?: { full_name?: string | null; email?: string } | null): string {
  if (!p) return "Someone";
  return p.full_name || p.email || "Someone";
}

export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the user's timezone
}

export function formatDue(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function percent(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0;
}
