"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FolderKanban, ListTodo, Plus, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMembers, uniquePeople } from "@/lib/data";
import { Member, STATUSES, Task, displayName, formatDue, percent, todayLocal } from "@/lib/types";
import { useApp } from "@/components/AppShell";
import ActivityFeed from "@/components/ActivityFeed";
import { Bar, Donut } from "@/components/charts";
import { ProjectDot, StatusBadge } from "@/components/badges";
import { Avatar, Button, Spinner } from "@/components/ui";

export default function DashboardPage() {
  const { user, name, projects, projectsLoaded, newProject } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);

  const ids = useMemo(() => projects.map((p) => p.id), [projects]);
  const idKey = ids.join(",");

  useEffect(() => {
    if (!projectsLoaded) return;
    (async () => {
      const [t, m] = await Promise.all([supabase.from("tasks").select("*").in("project_id", ids), fetchMembers(ids)]);
      setTasks((t.data || []) as Task[]);
      setMembers(m);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsLoaded, idKey]);

  const today = todayLocal();

  const stats = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "done");
    return {
      open: open.length,
      mine: open.filter((t) => t.assignee_id === user.id).length,
      overdue: open.filter((t) => t.due_date && t.due_date < today).length,
      done: tasks.length - open.length,
    };
  }, [tasks, user.id, today]);

  const workload = useMemo(() => {
    const people = uniquePeople(members);
    const rows = [...people.entries()].map(([id, p]) => ({
      id,
      name: displayName(p),
      count: tasks.filter((t) => t.assignee_id === id && t.status !== "done").length,
    }));
    rows.sort((a, b) => b.count - a.count);
    return rows.slice(0, 6);
  }, [members, tasks]);

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => t.assignee_id === user.id && t.status !== "done" && t.due_date)
        .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string))
        .slice(0, 5),
    [tasks, user.id]
  );

  if (!projectsLoaded || !loaded) return <Spinner />;

  const cards = [
    { label: "Projects", value: projects.length, icon: FolderKanban, color: "text-indigo-600 bg-indigo-50" },
    { label: "Open tasks", value: stats.open, icon: ListTodo, color: "text-sky-600 bg-sky-50" },
    { label: "Assigned to me", value: stats.mine, icon: UserCheck, color: "text-violet-600 bg-violet-50" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { label: "Completed", value: stats.done, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  ];

  const firstName = name.split(" ")[0] || "there";
  const completion = percent(stats.done, tasks.length);
  const maxLoad = Math.max(1, ...workload.map((w) => w.count));
  const projectName = new Map(projects.map((p) => [p.id, p]));

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h1 className="text-xl font-bold text-slate-900">Welcome, {firstName}</h1>
        <p className="mt-2 text-sm text-slate-500">Create your first project to start adding tasks and inviting your team.</p>
        <Button className="mt-5" onClick={newProject}>
          <Plus size={16} />
          Create project
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hi {firstName}, here&apos;s your overview</h1>
        <p className="text-sm text-slate-500">Everything across your projects in one place.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}>
              <Icon size={18} />
            </span>
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Task completion</h2>
          <div className="mt-4 flex items-center gap-5">
            <Donut
              size={140}
              thickness={16}
              center={`${completion}%`}
              sub="done"
              segments={STATUSES.map((s) => ({ value: tasks.filter((t) => t.status === s.id).length, color: s.color }))}
            />
            <ul className="space-y-2 text-sm">
              {STATUSES.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="w-20">{s.label}</span>
                  <span className="font-semibold text-slate-900">{tasks.filter((t) => t.status === s.id).length}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Workload balance</h2>
          <p className="text-xs text-slate-500">Open tasks per person</p>
          <ul className="mt-4 space-y-3">
            {workload.map((w) => (
              <li key={w.id} className="flex items-center gap-3">
                <Avatar name={w.name} size={26} />
                <span className="w-24 truncate text-sm text-slate-700">{w.name}</span>
                <div className="flex-1">
                  <Bar pct={(w.count / maxLoad) * 100} color="#6366f1" />
                </div>
                <span className="w-6 text-right text-sm font-semibold text-slate-900">{w.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">My upcoming deadlines</h2>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nothing with a due date is assigned to you.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcoming.map((t) => {
                const p = projectName.get(t.project_id);
                const late = (t.due_date as string) < today;
                return (
                  <li key={t.id}>
                    <Link href={`/projects/${t.project_id}`} className="flex items-center justify-between gap-3 hover:opacity-80">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{t.title}</span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          {p && <ProjectDot color={p.color} size={7} />}
                          {p?.name}
                        </span>
                      </span>
                      <span className={`shrink-0 text-xs font-medium ${late ? "text-red-600" : "text-slate-500"}`}>
                        {formatDue(t.due_date as string)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Project progress</h2>
            <Link href="/projects" className="text-sm font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-4">
            {projects.slice(0, 6).map((p) => {
              const pt = tasks.filter((t) => t.project_id === p.id);
              const done = pt.filter((t) => t.status === "done").length;
              const pct = percent(done, pt.length);
              return (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="block hover:opacity-80">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-900">
                        <ProjectDot color={p.color} />
                        {p.name}
                      </span>
                      <span className="text-slate-500">
                        {done}/{pt.length} · {pct}%
                      </span>
                    </div>
                    <Bar pct={pct} color={p.color} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">Recent activity</h2>
          <ActivityFeed projectIds={ids} members={members} projects={projects} limit={8} />
        </section>
      </div>

      {tasks.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Recently added tasks</h2>
          <ul className="divide-y divide-slate-100">
            {[...tasks]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 5)
              .map((t) => (
                <li key={t.id}>
                  <Link href={`/projects/${t.project_id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                    <span className="truncate text-sm font-medium text-slate-900">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
