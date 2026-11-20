"use client";

import { FormEvent, ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import type { User } from "@supabase/supabase-js";
import {
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PROJECT_COLORS, Project } from "@/lib/types";
import { Avatar, Button, ErrorNote, Input, Label, Modal, Spinner, Textarea } from "./ui";
import { ProjectDot } from "./badges";

interface AppCtx {
  user: User;
  name: string;
  projects: Project[];
  projectsLoaded: boolean;
  reloadProjects: () => Promise<void>;
  newProject: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside AppShell");
  return c;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "My tasks", icon: CheckSquare },
  { href: "/team", label: "Team", icon: Users },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useRequireAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [name, setName] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [creating, setCreating] = useState(false);

  const reloadProjects = useCallback(async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects((data || []) as Project[]);
    setProjectsLoaded(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    reloadProjects();
    supabase
      .from("profiles")
      .select("full_name,email")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setName(data?.full_name || data?.email || user.email || ""));
  }, [user, reloadProjects]);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading || !user) return <Spinner />;

  const ctx: AppCtx = {
    user,
    name: name || user.email || "",
    projects,
    projectsLoaded,
    reloadProjects,
    newProject: () => setCreating(true),
  };

  const sidebar = (
    <nav className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5 text-lg font-bold text-slate-900">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
          <LayoutDashboard size={18} />
        </span>
        PlanZoo
      </Link>

      <div className="space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/projects" ? pathname === "/projects" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between px-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Projects</span>
        <button
          onClick={() => setCreating(true)}
          aria-label="New project"
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              pathname === `/projects/${p.id}`
                ? "bg-indigo-50 font-medium text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <ProjectDot color={p.color} />
            <span className="truncate">{p.name}</span>
          </Link>
        ))}
        {projectsLoaded && projects.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-400">No projects yet</p>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={ctx.name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{ctx.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <Ctx.Provider value={ctx}>
      <div className="min-h-screen lg:flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
          {sidebar}
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawer(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{sidebar}</aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <GlobalSearch />
            <Button onClick={() => setCreating(true)} className="ml-auto">
              <Plus size={16} />
              <span className="hidden sm:inline">New project</span>
            </Button>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      {creating && (
        <NewProjectModal
          userId={user.id}
          onClose={() => setCreating(false)}
          onCreated={async (id) => {
            await reloadProjects();
            setCreating(false);
            router.push(`/projects/${id}`);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; project_id: string; projects: { name: string } | null }[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim().replace(/[%,]/g, " ");
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id,title,project_id,projects(name)")
        .ilike("title", `%${term}%`)
        .limit(6);
      setResults((data || []) as unknown as typeof results);
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function away(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input
        className="pl-9"
        placeholder="Search tasks across all projects"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {q && (
        <button
          onClick={() => {
            setQ("");
            setResults([]);
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      )}
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No tasks found</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                  router.push(`/projects/${r.project_id}`);
                }}
                className="block w-full px-4 py-2.5 text-left hover:bg-slate-50"
              >
                <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                <p className="truncate text-xs text-slate-500">{r.projects?.name}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NewProjectModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: name.trim(), description: description.trim() || null, owner_id: userId, color })
      .select()
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated(data.id);
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Project name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoFocus />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                style={{ background: c }}
                className={clsx(
                  "h-7 w-7 rounded-full ring-offset-2 transition",
                  color === c ? "ring-2 ring-slate-900" : "hover:scale-110"
                )}
              />
            ))}
          </div>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Creating..." : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
