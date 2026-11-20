"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, KanbanSquare, Users, BarChart3, LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase";

const features = [
  {
    icon: KanbanSquare,
    title: "Kanban boards",
    text: "Drag tasks between To do, In progress and Done. Changes show up live for everyone.",
  },
  {
    icon: Users,
    title: "Team collaboration",
    text: "Invite teammates by email, assign tasks, set due dates and discuss in comments.",
  },
  {
    icon: BarChart3,
    title: "Progress at a glance",
    text: "A dashboard shows open, overdue and completed work across all your projects.",
  },
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
            <LayoutDashboard size={18} />
          </span>
          PlanZoo
        </div>
        <Link
          href={signedIn ? "/dashboard" : "/login"}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          {signedIn ? "Open dashboard" : "Log in"}
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Plan work. Ship together.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          PlanZoo is a lightweight project management and team collaboration platform. Create a project, invite your
          team and move tasks from idea to done.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/login?mode=signup"}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            {signedIn ? "Go to dashboard" : "Get started free"}
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          {["No credit card", "Unlimited projects", "Real-time updates"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-24 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Icon size={20} />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
