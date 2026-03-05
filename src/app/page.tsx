"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Task, TeamMember, Startup } from "@/types";
import Modal from "@/components/Modal";
import TaskForm from "@/components/TaskForm";

type Filter = "today" | "week" | "overdue";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getEndOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function filterTasks(tasks: Task[], filter: Filter): Task[] {
  const today = getToday();
  const endOfWeek = getEndOfWeek();
  return tasks.filter((t) => {
    if (t.status === "done") return false;
    if (!t.due_date) return filter === "overdue" ? false : true;
    switch (filter) {
      case "today":
        return t.due_date <= today;
      case "week":
        return t.due_date <= endOfWeek;
      case "overdue":
        return t.due_date < today;
    }
  });
}

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-ink-100 text-ink-500",
};

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [filter, setFilter] = useState<Filter>("today");
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddStartup, setShowAddStartup] = useState(false);
  const [newStartupName, setNewStartupName] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [t, tm, s] = await Promise.all([
        api().getTasks(),
        api().getTeam(),
        api().getStartups(),
      ]);
      setTasks(t);
      setTeam(tm);
      setStartups(s);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to load data:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = filterTasks(tasks, filter);
  const today = getToday();

  const groupedByOwner = team.map((member) => ({
    member,
    tasks: filtered
      .filter((t) => t.owner_id === member.team_id)
      .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999")),
  }));

  const unassigned = filtered.filter(
    (t) => !t.owner_id || !team.some((m) => m.team_id === t.owner_id)
  );

  const overdueTasks = tasks.filter(
    (t) => t.status !== "done" && t.due_date && t.due_date < today
  );
  const activeStartups = startups.filter((s) => s.status === "active");

  const handleCreateTask = async (data: Partial<Task>) => {
    try {
      await api().createTask(data);
      setShowAddTask(false);
      setError(null);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to create task: ${msg}`);
    }
  };

  const handleToggleDone = async (task: Task) => {
    try {
      await api().updateTask({
        task_id: task.task_id,
        status: task.status === "done" ? "todo" : "done",
      });
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to update task: ${msg}`);
    }
  };

  const handleUpdateTask = async (data: Partial<Task>) => {
    try {
      await api().updateTask(data);
      setEditingTask(null);
      setError(null);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to update task: ${msg}`);
    }
  };

  const handleCreateStartup = async () => {
    if (!newStartupName.trim()) return;
    try {
      await api().createStartup({ startup_name: newStartupName.trim() });
      setNewStartupName("");
      setShowAddStartup(false);
      setError(null);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to create startup: ${msg}`);
    }
  };

  const getStartupName = (id: string) =>
    startups.find((s) => s.startup_id === id)?.startup_name || "";

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-200/40 rounded-lg w-48"></div>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="h-20 bg-brand-200/40 rounded-2xl"></div>
            <div className="h-20 bg-brand-200/40 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Dashboard</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddTask(true)}
            className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
          >
            + Add Task
          </button>
          <button
            onClick={() => setShowAddStartup(true)}
            className="px-4 py-2 text-sm bg-surface-0 text-ink-700 border border-brand-200/60 rounded-xl hover:bg-brand-50 transition-colors font-medium"
          >
            + Add Startup
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="bg-surface-0 border border-brand-200/60 rounded-2xl px-5 py-4">
          <p className="text-2xl font-bold text-ink-800">{activeStartups.length}</p>
          <p className="text-xs text-ink-400 mt-0.5">Active Startups</p>
        </div>
        <div className="bg-surface-0 border border-brand-200/60 rounded-2xl px-5 py-4">
          <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? "text-red-600" : "text-ink-800"}`}>
            {overdueTasks.length}
          </p>
          <p className="text-xs text-ink-400 mt-0.5">Overdue Tasks</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-6">
        {(["today", "week", "overdue"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 text-sm rounded-xl capitalize font-medium transition-colors ${
              filter === f
                ? "bg-brand-500 text-white shadow-sm"
                : "text-ink-500 bg-surface-0 border border-brand-200/60 hover:bg-brand-50"
            }`}
          >
            {f === "week" ? "This Week" : f}
          </button>
        ))}
      </div>

      {/* Tasks by owner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {groupedByOwner.map(({ member, tasks: memberTasks }) => (
          <div key={member.team_id}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-sm font-semibold text-ink-700">{member.name}</h3>
              <span className="text-xs text-ink-400">({memberTasks.length})</span>
            </div>
            <div className="space-y-2">
              {memberTasks.length === 0 && (
                <p className="text-xs text-ink-300 py-2 italic">No tasks</p>
              )}
              {memberTasks.map((task) => (
                <div key={task.task_id} className="bg-surface-0 border border-brand-200/60 rounded-xl px-3 py-2.5 hover:border-brand-400 transition-colors">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => handleToggleDone(task)}
                      className="mt-0.5 w-4 h-4 rounded border border-brand-300 flex-shrink-0 hover:border-brand-500 flex items-center justify-center transition-colors"
                    >
                      {task.status === "done" && (
                        <span className="text-brand-600 text-xs">&#10003;</span>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-ink-800 leading-snug">{task.title}</p>
                        <button
                          onClick={() => setEditingTask(task)}
                          className="text-ink-300 hover:text-ink-500 text-xs ml-2 flex-shrink-0 transition-colors"
                        >
                          edit
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span className={`text-xs ${task.due_date < today ? "text-red-500 font-medium" : "text-ink-400"}`}>
                            {task.due_date}
                          </span>
                        )}
                        {task.startup_id && (
                          <span className="text-xs text-ink-400">{getStartupName(task.startup_id)}</span>
                        )}
                        {task.priority && task.priority !== "medium" && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-md ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink-500 mb-3">Unassigned ({unassigned.length})</h3>
          <div className="space-y-2 max-w-md">
            {unassigned.map((task) => (
              <div key={task.task_id} className="bg-surface-0 border border-brand-200/60 rounded-xl px-3 py-2.5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-ink-800">{task.title}</p>
                  <button onClick={() => setEditingTask(task)} className="text-ink-300 hover:text-ink-500 text-xs ml-2 flex-shrink-0 transition-colors">edit</button>
                </div>
                {task.due_date && (
                  <span className={`text-xs ${task.due_date < today ? "text-red-500 font-medium" : "text-ink-400"}`}>
                    {task.due_date}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title="Add Task">
        <TaskForm team={team} startups={startups} onSubmit={handleCreateTask} onCancel={() => setShowAddTask(false)} />
      </Modal>

      {/* Edit Task Modal */}
      <Modal open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
        {editingTask && (
          <TaskForm team={team} startups={startups} initial={editingTask} onSubmit={handleUpdateTask} onCancel={() => setEditingTask(null)} />
        )}
      </Modal>

      {/* Add Startup Modal */}
      <Modal open={showAddStartup} onClose={() => setShowAddStartup(false)} title="Add Startup">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Startup Name *</label>
            <input
              type="text"
              value={newStartupName}
              onChange={(e) => setNewStartupName(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="e.g. Acme Corp"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateStartup(); }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddStartup(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
            <button onClick={handleCreateStartup} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium">Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
