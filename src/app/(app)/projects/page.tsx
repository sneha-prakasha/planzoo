"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMembers } from "@/lib/data";
import { Member, Task, displayName, percent } from "@/lib/types";
import { useApp } from "@/components/AppShell";
import { Bar } from "@/components/charts";
import { Avatar, Button, Input, Spinner } from "@/components/ui";

export default function ProjectsPage() {
  const { user, projects, projectsLoaded, newProject } = useApp();
  const [tasks, setTasks] = useState<Pick<Task, "project_id" | "status">[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);

  const ids = useMemo(() => projects.map((p) => p.id), [projects]);
  const idKey = ids.join(",");

  useEffect(() => {
    if (!projectsLoaded) return;
    (async () => {
      const [t, m] = await Promise.all([
        supabase.from("tasks").select("project_id,status").in("project_id", ids),
        fetchMembers(ids),
      ]);
      setTasks((t.data || []) as Pick<Task, "project_id" | "status">[]);
      setMembers(m);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsLoaded, idKey]);

  if (!projectsLoaded || !loaded) return <Spinner />;

  const shown = projects.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">{projects.length} total</p>
        </div>
        <Button onClick={newProject}>
          <Plus size={16} />
          New project
        </Button>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {projects.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-medium text-slate-900">No projects yet</p>
          <p className="mt-1 text-sm text-slate-500">Create your first project to start adding tasks.</p>
          <Button className="mt-4" onClick={newProject}>
            <Plus size={16} />
            Create project
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No projects match &ldquo;{q}&rdquo;.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const pt = tasks.filter((t) => t.project_id === p.id);
            const done = pt.filter((t) => t.status === "done").length;
            const pct = percent(done, pt.length);
            const team = members.filter((m) => m.project_id === p.id);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-indigo-300 hover:shadow-sm"
              >
                <div className="h-1.5" style={{ background: p.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    {p.owner_id === user.id && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Owner</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">{p.description || "No description"}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {done} of {pt.length} tasks done
                    </span>
                    <span className="font-medium text-slate-700">{pct}%</span>
                  </div>
                  <div className="mt-1.5">
                    <Bar pct={pct} color={p.color} />
                  </div>
                  <div className="mt-4 flex -space-x-2">
                    {team.slice(0, 5).map((m) => (
                      <span key={m.user_id} className="rounded-full ring-2 ring-white">
                        <Avatar name={displayName(m.profiles)} size={26} />
                      </span>
                    ))}
                    {team.length > 5 && (
                      <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                        +{team.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
