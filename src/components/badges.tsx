import { STATUSES } from "@/lib/types";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find((x) => x.id === status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ background: s?.color ?? "#94a3b8" }} />
      {s?.label ?? status}
    </span>
  );
}

export function ProjectDot({ color, size = 10 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} />;
}
