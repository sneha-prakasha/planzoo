"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMembers } from "@/lib/data";
import { Member, Project, STATUSES, Task, displayName, formatDue, percent, todayLocal } from "@/lib/types";
import { useApp } from "@/components/AppShell";
import ActivityFeed from "@/components/ActivityFeed";
import Board from "@/components/Board";
import Members from "@/components/Members";
import TaskModal from "@/components/TaskModal";
import TaskTable from "@/components/TaskTable";
import { Bar } from "@/components/charts";
import { StatusBadge } from "@/components/badges";
import { Avatar, Button, ErrorNote, Spinner } from "@/components/ui";

type Tab = "overview" | "board" | "list" | "members";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, reloadProjects } = useApp();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<Tab>("board");
  const [active, setActive] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadMembers = useCallback(async () => {
    setMembers(await fetchMembers([id]));
  }, [id]);

  const loadTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").eq("project_id", id).order("position", { ascending: true });
    setTasks((data || []) as Task[]);
  }, [id]);

  useEffect(() => {
    setLoaded(false);
    setProject(null);
    setError("");
    (async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        setError("Project not found, or you don't have access to it.");
      } else {
        setProject(data as Project);
        await Promise.all([loadMembers(), loadTasks()]);
      }
      setLoaded(true);
    })();

    // Live updates: refetch whenever a teammate changes a task in this project.
    const channel = supabase
      .channel(`tasks-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${id}` }, () =>
        loadTasks()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadMembers, loadTasks]);

  const nameOf = useCallback(
    (uid: string | null) => {
      if (!uid) return null;
      return displayName(members.find((m) => m.user_id === uid)?.profiles);
    },
    [members]
  );

  const today = todayLocal();

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "done").length;
    return {
      total: tasks.length,
      done,
      pct: percent(done, tasks.length),
      overdue: tasks.filter((t) => t.status !== "done" && t.due_date && t.due_date < today).length,
    };
  }, [tasks, today]);

  async function deleteProject() {
    if (!project) return;
    if (!window.confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) {
      setError(error.message);
      return;
    }
    await reloadProjects();
    router.push("/projects");
  }

  if (!loaded) return <Spinner />;

  if (!project) {
    return (
      <div className="max-w-xl">
        <ErrorNote>{error}</ErrorNote>
        <Link href="/projects" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const isOwner = project.owner_id === user.id;
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "board", label: "Board" },
    { id: "list", label: "List" },
    { id: "members", label: `Members (${members.length})` },
  ];

  const upcoming = tasks
    .filter((t) => t.status !== "done" && t.due_date)
    .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string))
    .slice(0, 5);

  return (
    <div>
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={14} /> Projects
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-9 w-2 shrink-0 rounded-full" style={{ background: project.color }} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            {project.description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden w-48 sm:block">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span className="font-medium text-slate-700">{stats.pct}%</span>
            </div>
            <Bar pct={stats.pct} color={project.color} />
          </div>
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m) => (
              <span key={m.user_id} className="rounded-full ring-2 ring-slate-50">
                <Avatar name={displayName(m.profiles)} size={30} />
              </span>
            ))}
            {members.length > 4 && (
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600 ring-2 ring-slate-50">
                +{members.length - 4}
              </span>
            )}
          </div>
          {isOwner && (
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={deleteProject}>
              <Trash2 size={14} />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "board" && (
          <Board
            projectId={project.id}
            userId={user.id}
            tasks={tasks}
            setTasks={setTasks}
            nameOf={nameOf}
            onOpen={setActive}
            onReload={loadTasks}
          />
        )}

        {tab === "list" && (
          <TaskTable
            tasks={[...tasks].sort((a, b) => a.created_at.localeCompare(b.created_at))}
            nameOf={nameOf}
            onOpen={setActive}
            empty="No tasks yet. Add some from the Board tab."
          />
        )}

        {tab === "members" && <Members project={project} members={members} userId={user.id} onChanged={loadMembers} />}

        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Total tasks", value: stats.total },
                  { label: "Completed", value: stats.done },
                  { label: "Overdue", value: stats.overdue },
                  { label: "Members", value: members.length },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                    <p className="text-sm text-slate-500">{c.label}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-semibold text-slate-900">Tasks by status</h2>
                <ul className="mt-4 space-y-3">
                  {STATUSES.map((s) => {
                    const n = tasks.filter((t) => t.status === s.id).length;
                    return (
                      <li key={s.id} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-slate-600">{s.label}</span>
                        <div className="flex-1">
                          <Bar pct={percent(n, tasks.length)} color={s.color} />
                        </div>
                        <span className="w-6 text-right font-semibold text-slate-900">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-semibold text-slate-900">Upcoming deadlines</h2>
                {upcoming.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">No open tasks have a due date.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {upcoming.map((t) => (
                      <li key={t.id}>
                        <button onClick={() => setActive(t)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:opacity-80">
                          <span className="min-w-0 truncate text-sm font-medium text-slate-900">{t.title}</span>
                          <span className="flex shrink-0 items-center gap-3">
                            <StatusBadge status={t.status} />
                            <span className={clsx("text-xs font-medium", (t.due_date as string) < today ? "text-red-600" : "text-slate-500")}>
                              {formatDue(t.due_date as string)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="h-fit rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Activity</h2>
              <ActivityFeed projectIds={[project.id]} members={members} limit={15} />
            </section>
          </div>
        )}
      </div>

      {active && (
        <TaskModal
          task={active}
          members={members}
          userId={user.id}
          onClose={() => setActive(null)}
          onUpdated={(t) => {
            setTasks((ts) => ts.map((x) => (x.id === t.id ? t : x)));
            setActive(null);
          }}
          onDeleted={(tid) => {
            setTasks((ts) => ts.filter((x) => x.id !== tid));
            setActive(null);
          }}
        />
      )}
    </div>
  );
}
