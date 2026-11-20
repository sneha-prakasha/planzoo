"use client";

import { Dispatch, SetStateAction, useMemo, useState } from "react";
import clsx from "clsx";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { CalendarDays, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { STATUSES, Status, Task, formatDue, todayLocal } from "@/lib/types";
import { Avatar, Button, ErrorNote, Input, PriorityBadge } from "./ui";

function sortTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => a.position - b.position);
}

export default function Board({
  projectId,
  userId,
  tasks,
  setTasks,
  nameOf,
  onOpen,
  onReload,
}: {
  projectId: string;
  userId: string;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  nameOf: (id: string | null) => string | null;
  onOpen: (t: Task) => void;
  onReload: () => void;
}) {
  const [error, setError] = useState("");
  const [addingIn, setAddingIn] = useState<Status | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);

  const filtering = search.trim() !== "" || mineOnly;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => (!q || t.title.toLowerCase().includes(q)) && (!mineOnly || t.assignee_id === userId));
  }, [tasks, search, mineOnly, userId]);

  async function onDragEnd(r: DropResult) {
    const { destination, source, draggableId } = r;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Status;
    const column = sortTasks(tasks.filter((t) => t.status === newStatus && t.id !== draggableId));
    const prev = column[destination.index - 1]?.position;
    const next = column[destination.index]?.position;

    let position: number;
    if (prev === undefined && next === undefined) position = 1000;
    else if (prev === undefined) position = next - 1000;
    else if (next === undefined) position = prev + 1000;
    else position = (prev + next) / 2;

    setTasks((ts) => ts.map((t) => (t.id === draggableId ? { ...t, status: newStatus, position } : t)));
    const { error } = await supabase.from("tasks").update({ status: newStatus, position }).eq("id", draggableId);
    if (error) {
      setError(error.message);
      onReload();
    }
  }

  async function addTask(status: Status) {
    const title = draftTitle.trim();
    if (!title) return;
    const column = tasks.filter((t) => t.status === status);
    const position = column.length ? Math.max(...column.map((t) => t.position)) + 1000 : 1000;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ project_id: projectId, title, status, position, created_by: userId })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setTasks((ts) => (ts.some((t) => t.id === data.id) ? ts : [...ts, data as Task]));
    setDraftTitle("");
    setAddingIn(null);
  }

  const today = todayLocal();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Filter tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          Only my tasks
        </label>
        {filtering && <span className="text-xs text-slate-400">Drag and drop is paused while filtering</span>}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((col) => {
            const items = sortTasks(visible.filter((t) => t.status === col.id));
            return (
              <div key={col.id} className="flex min-w-[250px] flex-1 flex-col rounded-xl bg-slate-100 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                    {col.label}
                  </h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{items.length}</span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={clsx(
                        "min-h-[48px] flex-1 space-y-2 rounded-lg transition-colors",
                        snapshot.isDraggingOver && "bg-indigo-50"
                      )}
                    >
                      {items.map((t, index) => {
                        const overdue = t.due_date && t.due_date < today && t.status !== "done";
                        const assignee = nameOf(t.assignee_id);
                        return (
                          <Draggable key={t.id} draggableId={t.id} index={index} isDragDisabled={filtering}>
                            {(p, s) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                                onClick={() => onOpen(t)}
                                className={clsx(
                                  "cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:border-indigo-300",
                                  s.isDragging ? "border-indigo-400 shadow-md" : "border-slate-200"
                                )}
                              >
                                <p className="text-sm font-medium text-slate-900">{t.title}</p>
                                {t.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>
                                )}
                                <div className="mt-3 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <PriorityBadge priority={t.priority} />
                                    {t.due_date && (
                                      <span
                                        className={clsx(
                                          "flex items-center gap-1 text-xs",
                                          overdue ? "font-medium text-red-600" : "text-slate-500"
                                        )}
                                      >
                                        <CalendarDays size={12} />
                                        {formatDue(t.due_date)}
                                      </span>
                                    )}
                                  </div>
                                  {assignee && <Avatar name={assignee} />}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {addingIn === col.id ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      autoFocus
                      placeholder="Task title, then Enter"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTask(col.id);
                        if (e.key === "Escape") {
                          setAddingIn(null);
                          setDraftTitle("");
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => addTask(col.id)} disabled={!draftTitle.trim()}>
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setAddingIn(null);
                          setDraftTitle("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingIn(col.id);
                      setDraftTitle("");
                    }}
                    className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-200"
                  >
                    <Plus size={14} />
                    Add task
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
