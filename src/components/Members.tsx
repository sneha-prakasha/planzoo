"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Mail, UserMinus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Invite, Member, Project, displayName } from "@/lib/types";
import { Avatar, Button, ErrorNote, Input } from "./ui";

export default function Members({
  project,
  members,
  userId,
  onChanged,
}: {
  project: Project;
  members: Member[];
  userId: string;
  onChanged: () => void;
}) {
  const router = useRouter();
  const isOwner = project.owner_id === userId;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);

  const loadInvites = useCallback(async () => {
    if (!isOwner) return;
    const { data } = await supabase
      .from("invites")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });
    setInvites((data || []) as Invite[]);
  }, [isOwner, project.id]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectId: project.id, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send invite");

      if (json.status === "added") {
        setMessage(`${email} was added to the project.`);
      } else {
        setMessage(
          `${email} hasn't signed up yet. They'll join automatically when they create an account.` +
            (json.emailSent ? " An invite email was sent." : "")
        );
      }
      setEmail("");
      onChanged();
      loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(m: Member) {
    const leaving = m.user_id === userId;
    const text = leaving ? "Leave this project?" : `Remove ${displayName(m.profiles)} from this project?`;
    if (!window.confirm(text)) return;
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", project.id)
      .eq("user_id", m.user_id);
    if (error) {
      setError(error.message);
      return;
    }
    if (leaving) router.push("/dashboard");
    else onChanged();
  }

  async function cancelInvite(id: string) {
    await supabase.from("invites").delete().eq("id", id);
    loadInvites();
  }

  return (
    <div className="max-w-2xl space-y-8">
      {isOwner && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            <Mail size={16} /> Invite a teammate
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            If they already have an account they&apos;re added right away. Otherwise they join automatically when they
            sign up with that email.
          </p>
          <form onSubmit={invite} className="mt-3 flex gap-2">
            <Input
              type="email"
              required
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={busy || !email.trim()}>
              {busy ? "Inviting..." : "Invite"}
            </Button>
          </form>
          {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        </section>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <section>
        <h3 className="mb-3 font-semibold text-slate-900">Members ({members.length})</h3>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {members.map((m) => {
            const name = displayName(m.profiles);
            const canRemove = m.role !== "owner" && (isOwner || m.user_id === userId);
            return (
              <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={name} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {name} {m.user_id === userId && <span className="text-slate-400">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{m.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                    {m.role}
                  </span>
                  {canRemove && (
                    <Button variant="ghost" onClick={() => removeMember(m)} aria-label="Remove member">
                      <UserMinus size={14} />
                      {m.user_id === userId ? "Leave" : ""}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {isOwner && invites.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold text-slate-900">Pending invites ({invites.length})</h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <Clock size={14} className="text-slate-400" />
                  {i.email}
                </span>
                <Button variant="ghost" onClick={() => cancelInvite(i.id)}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
