"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CommentRow, Member, PRIORITIES, Priority, STATUSES, Status, Task, displayName } from "@/lib/types";
import { Avatar, Button, ErrorNote, Input, Label, Modal, Select, Textarea } from "./ui";

export default function TaskModal({
  task,
  members,
  userId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  task: Task;
  members: Member[];
  userId: string;
  onClose: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<Status>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assignee, setAssignee] = useState(task.assignee_id ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(full_name,email)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    setComments((data || []) as CommentRow[]);
  }, [task.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { data, error } = await supabase
      .from("tasks")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assignee_id: assignee || null,
        due_date: dueDate || null,
      })
      .eq("id", task.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onUpdated(data as Task);
  }

  async function remove() {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      setError(error.message);
      return;
    }
    onDeleted(task.id);
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    const body = commentText.trim();
    if (!body) return;
    setPosting(true);
    const { error } = await supabase.from("comments").insert({ task_id: task.id, user_id: userId, body });
    setPosting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCommentText("");
    loadComments();
  }

  async function deleteComment(id: string) {
    await supabase.from("comments").delete().eq("id", id);
    loadComments();
  }

  return (
    <Modal title="Task details" onClose={onClose} wide>
      <div className="grid gap-6 md:grid-cols-5">
        <form onSubmit={save} className="space-y-4 md:col-span-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add more detail..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Assignee</Label>
              <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {displayName(m.profiles)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={remove} className="text-red-600 hover:bg-red-50">
              <Trash2 size={14} />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </form>

        <div className="md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Comments ({comments.length})</h3>
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
            {comments.map((c) => {
              const name = displayName(c.profiles);
              return (
                <div key={c.id} className="flex gap-2">
                  <Avatar name={name} size={28} />
                  <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-700">{name}</span>
                      {c.user_id === userId && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          aria-label="Delete comment"
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{c.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={addComment} className="mt-3 space-y-2">
            <Textarea
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              maxLength={2000}
            />
            <Button type="submit" disabled={posting || !commentText.trim()}>
              {posting ? "Posting..." : "Comment"}
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
