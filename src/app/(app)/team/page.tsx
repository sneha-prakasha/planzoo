"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMembers } from "@/lib/data";
import { Member, Task, displayName } from "@/lib/types";
import { useApp } from "@/components/AppShell";
import { ProjectDot } from "@/components/badges";
import { Avatar, Input, Spinner } from "@/components/ui";

export default function TeamPage() {
  const { user, projects, projectsLoaded } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Pick<Task, "assignee_id" | "status">[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);

  const ids = useMemo(() => projects.map((p) => p.id), [projects]);
  const idKey = ids.join(",");

  useEffect(() => {
    if (!projectsLoaded) return;
    (async () => {
      const [m, t] = await Promise.all([
        fetchMembers(ids),
        supabase.from("tasks").select("assignee_id,status").in("project_id", ids),
      ]);
      setMembers(m);
      setTasks((t.data || []) as Pick<Task, "assignee_id" | "status">[]);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsLoaded, idKey]);

  const people = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; projectIds: string[] }>();
    for (const m of members) {
      if (!m.profiles) continue;
      const cur = map.get(m.user_id) ?? { id: m.user_id, name: displayName(m.profiles), email: m.profiles.email, projectIds: [] };
      cur.projectIds.push(m.project_id);
      map.set(m.user_id, cur);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  if (!projectsLoaded || !loaded) return <Spinner />;

  const term = q.trim().toLowerCase();
  const shown = people.filter((p) => !term || p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Team</h1>
      <p className="text-sm text-slate-500">
        {people.length} {people.length === 1 ? "person" : "people"} across your projects. Invite more from a project&apos;s Members tab.
      </p>

      <div className="relative mt-5 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No teammates found.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const mine = tasks.filter((t) => t.assignee_id === p.id);
            const open = mine.filter((t) => t.status !== "done").length;
            const done = mine.length - open;
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {p.name} {p.id === user.id && <span className="font-normal text-slate-400">(you)</span>}
                    </p>
                    <a href={`mailto:${p.email}`} className="flex items-center gap-1 truncate text-xs text-slate-500 hover:text-indigo-600">
                      <Mail size={12} />
                      {p.email}
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="text-lg font-bold text-slate-900">{open}</p>
                    <p className="text-xs text-slate-500">Open tasks</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="text-lg font-bold text-slate-900">{done}</p>
                    <p className="text-xs text-slate-500">Completed</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.projectIds.map((pid) => {
                    const pr = projects.find((x) => x.id === pid);
                    if (!pr) return null;
                    return (
                      <Link
                        key={pid}
                        href={`/projects/${pid}`}
                        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200"
                      >
                        <ProjectDot color={pr.color} size={7} />
                        {pr.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
