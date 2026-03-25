"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Task, TeamMember, Startup, MeetingNote, ProjectInvestor, Investor, Project } from "@/types";
import { SENTIMENT_CONFIG } from "@/types";
import Modal from "@/components/Modal";
import TaskForm from "@/components/TaskForm";
import CalendarWidget from "@/components/CalendarWidget";
import Link from "next/link";

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

function daysAgo(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
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
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [piLinks, setPiLinks] = useState<ProjectInvestor[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<Filter>("today");
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddStartup, setShowAddStartup] = useState(false);
  const [newStartupName, setNewStartupName] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  // For calendar widget — use first team member as default team_id
  // In a real app this would come from the auth session
  const [currentTeamId, setCurrentTeamId] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [t, tm, s, mn, pi, inv, prj] = await Promise.all([
        api().getTasks(),
        api().getTeam(),
        api().getStartups(),
        api().getMeetingNotes(),
        api().getProjectInvestors(),
        api().getInvestors(),
        api().getProjects(),
      ]);
      setTasks(t);
      setTeam(tm);
      setStartups(s);
      setMeetingNotes(mn);
      setPiLinks(pi);
      setInvestors(inv);
      setProjects(prj);
      if (tm.length > 0 && !currentTeamId) {
        setCurrentTeamId(tm[0].team_id);
      }
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to load data:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

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

  // Recent meeting notes (last 5)
  const recentNotes = [...meetingNotes]
    .sort((a, b) => (b.meeting_date || b.created_at).localeCompare(a.meeting_date || a.created_at))
    .slice(0, 5);

  // Pipeline highlights: active deals with most recent activity
  const pipelineHighlights = (() => {
    const activeStages = ["Trying to reach", "Active", "Advanced"];
    const activeLinks = piLinks
      .filter((l) => activeStages.includes(l.stage))
      .sort((a, b) => (b.last_interaction_date || b.updated_at || "").localeCompare(a.last_interaction_date || a.updated_at || ""))
      .slice(0, 5);

    return activeLinks.map((link) => {
      const inv = investors.find((i) => i.investor_id === link.investor_id);
      const proj = projects.find((p) => p.project_id === link.project_id);
      const startup = proj ? startups.find((s) => s.startup_id === proj.startup_id) : null;
      const latestNote = meetingNotes
        .filter((n) => n.investor_id === link.investor_id)
        .sort((a, b) => (b.meeting_date || b.created_at).localeCompare(a.meeting_date || a.created_at))[0];

      return {
        link,
        investor: inv,
        project: proj,
        startup,
        latestNote,
        lastInteraction: link.last_interaction_date || link.updated_at || "",
      };
    });
  })();

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

  const getInvestorName = (id: string) =>
    investors.find((i) => i.investor_id === id)?.investor_name || id;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-200/40 rounded-lg w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-brand-200/40 rounded-2xl"></div>
            <div className="h-20 bg-brand-200/40 rounded-2xl"></div>
            <div className="h-20 bg-brand-200/40 rounded-2xl"></div>
            <div className="h-20 bg-brand-200/40 rounded-2xl"></div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 h-96 bg-brand-200/40 rounded-2xl"></div>
            <div className="h-96 bg-brand-200/40 rounded-2xl"></div>
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

      {/* Summary cards — 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
        <div className="bg-surface-0 border border-brand-200/60 rounded-2xl px-5 py-4">
          <p className="text-2xl font-bold text-ink-800">{meetingNotes.length}</p>
          <p className="text-xs text-ink-400 mt-0.5">Meeting Notes</p>
        </div>
        <div className="bg-surface-0 border border-brand-200/60 rounded-2xl px-5 py-4">
          <p className="text-2xl font-bold text-ink-800">{piLinks.filter((l) => ["Active", "Advanced"].includes(l.stage)).length}</p>
          <p className="text-xs text-ink-400 mt-0.5">Active Deals</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN — 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Widget */}
          {currentTeamId && (
            <CalendarWidget teamId={currentTeamId} onNoteCreated={loadData} />
          )}

          {/* Recent Meeting Notes */}
          <div className="bg-surface-0 border border-brand-200/60 rounded-2xl">
            <div className="px-5 py-3 border-b border-brand-200/60">
              <h3 className="text-sm font-semibold text-ink-700">Recent Meeting Notes</h3>
            </div>
            <div className="p-3">
              {recentNotes.length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-6">No meeting notes yet</p>
              ) : (
                <div className="space-y-2">
                  {recentNotes.map((note) => (
                    <div key={note.note_id} className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-brand-50/50 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${SENTIMENT_CONFIG[note.sentiment]?.dot || "bg-amber-400"}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-400">{note.meeting_date}</span>
                          {note.investor_id && (
                            <span className="text-xs text-brand-600 font-medium">{getInvestorName(note.investor_id)}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-ink-800 truncate">{note.subject}</p>
                        <p className="text-xs text-ink-400 line-clamp-1 mt-0.5">{note.summary}</p>
                      </div>
                      {note.project_id && (
                        <Link
                          href={`/projects/${note.project_id}`}
                          className="text-[10px] text-brand-500 hover:text-brand-700 flex-shrink-0"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — 1/3 width */}
        <div className="space-y-6">
          {/* Tasks section */}
          <div className="bg-surface-0 border border-brand-200/60 rounded-2xl">
            <div className="px-5 py-3 border-b border-brand-200/60">
              <h3 className="text-sm font-semibold text-ink-700">Today&apos;s Tasks</h3>
            </div>
            <div className="px-3 py-2">
              {/* Filters */}
              <div className="flex gap-1 mb-3">
                {(["today", "week", "overdue"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 text-xs rounded-lg capitalize font-medium transition-colors ${
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
              <div className="space-y-4">
                {groupedByOwner.map(({ member, tasks: memberTasks }) => (
                  <div key={member.team_id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <h4 className="text-xs font-semibold text-ink-700">{member.name}</h4>
                      <span className="text-[10px] text-ink-400">({memberTasks.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {memberTasks.length === 0 && (
                        <p className="text-[10px] text-ink-300 py-1 italic">No tasks</p>
                      )}
                      {memberTasks.map((task) => (
                        <div key={task.task_id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-brand-50/50 transition-colors group">
                          <button
                            onClick={() => handleToggleDone(task)}
                            className="mt-0.5 w-3.5 h-3.5 rounded border border-brand-300 flex-shrink-0 hover:border-brand-500 flex items-center justify-center transition-colors"
                          >
                            {task.status === "done" && (
                              <span className="text-brand-600 text-[10px]">&#10003;</span>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-ink-800 leading-snug">{task.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {task.due_date && (
                                <span className={`text-[10px] ${task.due_date < today ? "text-red-500 font-medium" : "text-ink-400"}`}>
                                  {task.due_date}
                                </span>
                              )}
                              {task.priority && task.priority !== "medium" && (
                                <span className={`text-[10px] px-1 py-0 rounded ${PRIORITY_COLORS[task.priority]}`}>
                                  {task.priority}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingTask(task)}
                            className="text-ink-300 hover:text-ink-500 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            edit
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {unassigned.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-ink-500 mb-2">Unassigned ({unassigned.length})</h4>
                    <div className="space-y-1.5">
                      {unassigned.map((task) => (
                        <div key={task.task_id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-brand-50/50 transition-colors">
                          <button
                            onClick={() => handleToggleDone(task)}
                            className="mt-0.5 w-3.5 h-3.5 rounded border border-brand-300 flex-shrink-0 hover:border-brand-500 flex items-center justify-center transition-colors"
                          >
                            {task.status === "done" && (
                              <span className="text-brand-600 text-[10px]">&#10003;</span>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-ink-800">{task.title}</p>
                            {task.due_date && (
                              <span className={`text-[10px] ${task.due_date < today ? "text-red-500 font-medium" : "text-ink-400"}`}>
                                {task.due_date}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline Highlights */}
          <div className="bg-surface-0 border border-brand-200/60 rounded-2xl">
            <div className="px-5 py-3 border-b border-brand-200/60">
              <h3 className="text-sm font-semibold text-ink-700">Pipeline Highlights</h3>
            </div>
            <div className="p-3">
              {pipelineHighlights.length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-6">No active deals</p>
              ) : (
                <div className="space-y-2">
                  {pipelineHighlights.map(({ link, investor, project, startup, latestNote, lastInteraction }) => (
                    <div key={link.link_id} className="px-2 py-2 rounded-lg hover:bg-brand-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-ink-800 truncate">
                            {startup?.startup_name || ""} × {investor?.investor_name || ""}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded font-medium">
                              {link.stage}
                            </span>
                            {latestNote && (
                              <div className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_CONFIG[latestNote.sentiment]?.dot || "bg-amber-400"}`}></div>
                            )}
                            {latestNote?.sentiment === "negative" && (
                              <span className="text-[10px] px-1 py-0 bg-red-100 text-red-700 rounded font-medium">At risk</span>
                            )}
                          </div>
                        </div>
                        {project && (
                          <Link
                            href={`/projects/${project.project_id}`}
                            className="text-[10px] text-brand-500 hover:text-brand-700 flex-shrink-0"
                          >
                            View
                          </Link>
                        )}
                      </div>
                      {lastInteraction && (
                        <p className="text-[10px] text-ink-400 mt-1">Last: {daysAgo(lastInteraction)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
