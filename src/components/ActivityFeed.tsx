"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ActivityRow, Member, Project, displayName, statusLabel, timeAgo } from "@/lib/types";
import { Avatar } from "./ui";

export default function ActivityFeed({
  projectIds,
  members,
  projects,
  limit = 12,
}: {
  projectIds: string[];
  members: Member[];
  projects?: Project[];
  limit?: number;
}) {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const key = projectIds.join(",");

  const load = useCallback(async () => {
    if (projectIds.length === 0) {
      setRows([]);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("activity")
      .select("*, profiles(full_name,email)")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    setRows((data || []) as ActivityRow[]);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, limit]);

  useEffect(() => {
    load();
    if (projectIds.length !== 1) return;
    const channel = supabase
      .channel(`activity-${projectIds[0]}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity", filter: `project_id=eq.${projectIds[0]}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, load]);

  const names = useMemo(() => {
    const m = new Map<string, string>();
    members.forEach((x) => x.profiles && m.set(x.user_id, displayName(x.profiles)));
    return m;
  }, [members]);

  const projectName = useMemo(() => new Map((projects || []).map((p) => [p.id, p.name])), [projects]);

  if (!loaded) return <p className="text-sm text-slate-400">Loading...</p>;
  if (rows.length === 0) return <p className="text-sm text-slate-400">No activity yet. Add or move a task to get started.</p>;

  function describe(r: ActivityRow) {
    switch (r.action) {
      case "created":
        return "created";
      case "moved":
        return `moved to ${statusLabel(r.detail || "")}:`;
      case "assigned":
        return `assigned to ${names.get(r.detail || "") ?? "a teammate"}:`;
      case "commented":
        return "commented on";
    }
  }

  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const who = displayName(r.profiles);
        return (
          <li key={r.id} className="flex gap-3">
            <Avatar name={who} size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{who}</span> {describe(r)}{" "}
                <span className="font-medium text-slate-900">&ldquo;{r.task_title}&rdquo;</span>
              </p>
              <p className="text-xs text-slate-400">
                {timeAgo(r.created_at)}
                {projectName.get(r.project_id) ? ` · ${projectName.get(r.project_id)}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
