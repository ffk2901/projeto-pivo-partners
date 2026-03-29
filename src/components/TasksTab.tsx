"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Task, TeamMember, Startup } from "@/types";
import Modal from "./Modal";
import TaskForm from "./TaskForm";

interface Props {
  startupId: string;
  tasks: Task[];
  team: TeamMember[];
  startups: Startup[];
  onRefresh: () => void;
  readOnly?: boolean;
  apiPrefix?: string;
}

type View = "byPerson" | "list";

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-ink-100 text-ink-500",
};

export default function TasksTab({ startupId, tasks, team, startups, onRefresh, readOnly, apiPrefix }: Props) {
  const [view, setView] = useState<View>("byPerson");
  const [showAdd, setShowAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [syncingTask, setSyncingTask] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const filteredTasks = filterStatus === "all" ? tasks : tasks.filter((t) => t.status === filterStatus);

  const handleCreate = async (data: Partial<Task>) => {
    await api(apiPrefix).createTask({ ...data, startup_id: startupId });
    setShowAdd(false);
    onRefresh();
  };

  const handleUpdate = async (data: Partial<Task>) => {
    await api(apiPrefix).updateTask(data);
    setEditingTask(null);
    onRefresh();
  };

  const handleToggle = async (task: Task) => {
    await api(apiPrefix).updateTask({
      task_id: task.task_id,
      status: task.status === "done" ? "todo" : "done",
    });
    onRefresh();
  };

  const handleCalendarSync = async (task: Task) => {
    setSyncingTask(task.task_id);
    setSyncError(null);
    try {
      await api(apiPrefix).syncTaskToCalendar(task.task_id);
      onRefresh();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Calendar sync failed");
    } finally {
      setSyncingTask(null);
    }
  };

  const handleCalendarUnsync = async (task: Task) => {
    setSyncingTask(task.task_id);
    setSyncError(null);
    try {
      await api(apiPrefix).unsyncTaskFromCalendar(task.task_id);
      onRefresh();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Calendar unsync failed");
    } finally {
      setSyncingTask(null);
    }
  };

  const getOwnerName = (id: string) => team.find((m) => m.team_id === id)?.name || "Unassigned";

  const SYNC_BADGE: Record<string, string> = {
    synced: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    none: "",
  };

  const renderTaskCard = (task: Task) => (
    <div key={task.task_id} className="bg-surface-0 border border-brand-200/60 rounded-xl px-3 py-2.5 hover:border-brand-400 transition-colors">
      <div className="flex items-start gap-2">
        <button
          onClick={() => !readOnly && handleToggle(task)}
          disabled={readOnly}
          className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            task.status === "done"
              ? "border-brand-500 bg-brand-500"
              : "border-brand-300 hover:border-brand-500"
          } ${readOnly ? "cursor-default opacity-70" : ""}`}
        >
          {task.status === "done" && <span className="text-white text-xs">&#10003;</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p className={`text-sm leading-snug ${task.status === "done" ? "text-ink-400 line-through" : "text-ink-800"}`}>
              {task.title}
            </p>
            {!readOnly && (
              <button onClick={() => setEditingTask(task)} className="text-ink-300 hover:text-ink-500 text-xs ml-2 flex-shrink-0 transition-colors">
                edit
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.due_date && (
              <span className={`text-xs ${task.due_date < today && task.status !== "done" ? "text-red-500 font-medium" : "text-ink-400"}`}>
                {task.due_date}{task.due_time ? ` ${task.due_time}` : ""}
              </span>
            )}
            {task.priority && task.priority !== "medium" && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority}
              </span>
            )}
            {task.status === "doing" && (
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">in progress</span>
            )}
            {task.sync_status === "synced" && (
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700" title="Synced to Google Calendar">
                Synced
              </span>
            )}
            {task.sync_status === "failed" && (
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-red-100 text-red-700" title="Calendar sync failed">
                Sync Failed
              </span>
            )}
            {task.due_date && task.owner_id && (
              syncingTask === task.task_id ? (
                <span className="text-[10px] text-ink-400 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin"></span>
                  syncing...
                </span>
              ) : task.sync_status === "synced" ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCalendarUnsync(task); }}
                  className="text-[10px] text-ink-400 hover:text-red-500 transition-colors"
                  title="Remove from Google Calendar"
                >
                  unsync
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCalendarSync(task); }}
                  className="text-[10px] text-brand-500 hover:text-brand-700 transition-colors font-medium"
                  title="Sync to Google Calendar"
                >
                  sync to cal
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button onClick={() => setView("byPerson")}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                view === "byPerson" ? "bg-brand-500 text-white" : "text-ink-500 bg-surface-0 border border-brand-200/60 hover:bg-brand-50"
              }`}>
              By Person
            </button>
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                view === "list" ? "bg-brand-500 text-white" : "text-ink-500 bg-surface-0 border border-brand-200/60 hover:bg-brand-50"
              }`}>
              List
            </button>
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-brand-200 rounded-xl px-2.5 py-1.5 bg-surface-0 focus:outline-none focus:ring-1 focus:ring-brand-500/40 cursor-pointer">
            <option value="all">All</option>
            <option value="todo">To Do</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        </div>
        {!readOnly && (
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm">
            + Add Task
          </button>
        )}
      </div>

      {syncError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{syncError}</p>
          <button onClick={() => setSyncError(null)} className="text-red-400 hover:text-red-600 text-xs font-medium ml-4">Dismiss</button>
        </div>
      )}

      {view === "byPerson" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((member) => {
            const memberTasks = filteredTasks
              .filter((t) => t.owner_id === member.team_id)
              .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
            return (
              <div key={member.team_id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="text-sm font-semibold text-ink-700">{member.name}</h4>
                  <span className="text-xs text-ink-400">({memberTasks.length})</span>
                </div>
                <div className="space-y-2">
                  {memberTasks.length === 0 && <p className="text-xs text-ink-300 py-2 italic">No tasks</p>}
                  {memberTasks.map(renderTaskCard)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {filteredTasks
            .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"))
            .map((task) => (
              <div key={task.task_id} className="flex items-center gap-2">
                <span className="text-xs text-ink-400 w-20 flex-shrink-0">{getOwnerName(task.owner_id)}</span>
                <div className="flex-1">{renderTaskCard(task)}</div>
              </div>
            ))}
          {filteredTasks.length === 0 && <p className="text-xs text-ink-400 italic">No tasks match the filter.</p>}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Task">
        <TaskForm team={team} startups={startups} initial={{ startup_id: startupId }} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
        {editingTask && (
          <TaskForm team={team} startups={startups} initial={editingTask} onSubmit={handleUpdate} onCancel={() => setEditingTask(null)} />
        )}
      </Modal>
    </div>
  );
}
