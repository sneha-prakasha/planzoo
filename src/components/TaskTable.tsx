"use client";

import clsx from "clsx";
import { CalendarDays } from "lucide-react";
import { Task, formatDue, todayLocal } from "@/lib/types";
import { Avatar, PriorityBadge } from "./ui";
import { ProjectDot, StatusBadge } from "./badges";

export default function TaskTable({
  tasks,
  nameOf,
  onOpen,
  projectOf,
  empty = "No tasks to show.",
}: {
  tasks: Task[];
  nameOf: (id: string | null) => string | null;
  onOpen: (t: Task) => void;
  projectOf?: (id: string) => { name: string; color: string } | undefined;
  empty?: string;
}) {
  const today = todayLocal();

  if (tasks.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Task</th>
            {projectOf && <th className="px-4 py-3 font-medium">Project</th>}
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Assignee</th>
            <th className="px-4 py-3 font-medium">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((t) => {
            const assignee = nameOf(t.assignee_id);
            const overdue = t.due_date && t.due_date < today && t.status !== "done";
            const p = projectOf?.(t.project_id);
            return (
              <tr key={t.id} onClick={() => onOpen(t)} className="cursor-pointer hover:bg-slate-50">
                <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">{t.title}</td>
                {projectOf && (
                  <td className="px-4 py-3">
                    {p && (
                      <span className="flex items-center gap-2 text-slate-600">
                        <ProjectDot color={p.color} size={8} />
                        <span className="truncate">{p.name}</span>
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-4 py-3">
                  {assignee ? (
                    <span className="flex items-center gap-2 text-slate-700">
                      <Avatar name={assignee} size={22} />
                      <span className="truncate">{assignee}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {t.due_date ? (
                    <span className={clsx("flex items-center gap-1", overdue ? "font-medium text-red-600" : "text-slate-600")}>
                      <CalendarDays size={13} />
                      {formatDue(t.due_date)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
