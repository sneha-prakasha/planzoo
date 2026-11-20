"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";
import { fetchMembers } from "@/lib/data";
import { Member, Task, displayName, todayLocal } from "@/lib/types";
import { useApp } from "@/components/AppShell";
import TaskModal from "@/components/TaskModal";
import TaskTable from "@/components/TaskTable";
import { Spinner } from "@/components/ui";

type Filter = "open" | "overdue" | "done" | "all";

export default function MyTasksPage() {
  const { user, projects, projectsLoaded } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("open");
  const [active, setActive] = useState<Task | null>(null);

  const ids = useMemo(() => projects.map((p) => p.id), [projects]);
  const idKey = ids.join(",");

  const load = useCallback(async () => {
    const [t, m] = await Promise.all([
      supabase.from("tasks").select("*").eq("assignee_id", user.id).order("due_date", { ascending: true, nullsFirst: false }),
      fetchMembers(ids),
    ]);
    setTasks((t.data || []) as Task[]);
    setMembers(m);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, idKey]);

  useEffect(() => {
    if (projectsLoaded) load();
  }, [projectsLoaded, load]);

  const today = todayLocal();

  const counts = useMemo(
    () => ({
      open: tasks.filter((t) => t.status !== "done").length,
      overdue: tasks.filter((t) => t.status !== "done" && t.due_date && t.due_date < today).length,
      done: tasks.filter((t) => t.status === "done").length,
      all: tasks.length,
    }),
    [tasks, today]
  );

  const shown = tasks.filter((t) => {
    if (filter === "open") return t.status !== "done";
    if (filter === "overdue") return t.status !== "done" && t.due_date && t.due_date < today;
    if (filter === "done") return t.status === "done";
    return true;
  });

  const nameOf = useCallback(
    (id: string | null) => {
      if (!id) return null;
      const m = members.find((x) => x.user_id === id);
      return displayName(m?.profiles);
    },
    [members]
  );

  const projectOf = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  if (!projectsLoaded || !loaded) return <Spinner />;

  const tabs: { id: Filter; label: string }[] = [
    { id: "open", label: "Open" },
    { id: "overdue", label: "Overdue" },
    { id: "done", label: "Done" },
    { id: "all", label: "All" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">My tasks</h1>
      <p className="text-sm text-slate-500">Everything assigned to you, across all projects.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              filter === t.id ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {t.label} <span className="opacity-70">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        <TaskTable
          tasks={shown}
          nameOf={nameOf}
          onOpen={setActive}
          projectOf={projectOf}
          empty={filter === "overdue" ? "Nothing overdue. Nice work." : "No tasks here. Tasks assigned to you will show up."}
        />
      </div>

      {active && (
        <TaskModal
          task={active}
          members={members.filter((m) => m.project_id === active.project_id)}
          userId={user.id}
          onClose={() => setActive(null)}
          onUpdated={(t) => {
            setTasks((ts) => ts.map((x) => (x.id === t.id ? t : x)));
            setActive(null);
          }}
          onDeleted={(id) => {
            setTasks((ts) => ts.filter((x) => x.id !== id));
            setActive(null);
          }}
        />
      )}
    </div>
  );
}
