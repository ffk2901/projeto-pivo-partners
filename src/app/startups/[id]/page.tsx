"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  Startup,
  Project,
  Task,
  ProjectInvestor,
  Investor,
  TeamMember,
} from "@/types";
import Modal from "@/components/Modal";
import TasksTab from "@/components/TasksTab";
import MaterialsTab from "@/components/MaterialsTab";

type Tab = "tasks" | "materials";

export default function StartupDetailPage() {
  const params = useParams();
  const startupId = params.id as string;

  const [startup, setStartup] = useState<Startup | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [piLinks, setPiLinks] = useState<ProjectInvestor[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [tab, setTab] = useState<Tab>("tasks");
  const [loading, setLoading] = useState(true);

  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [allStartups, allProjects, allTasks, pi, inv, tm] =
        await Promise.all([
          api().getStartups(),
          api().getProjects(startupId),
          api().getTasks(),
          api().getProjectInvestors(),
          api().getInvestors(),
          api().getTeam(),
        ]);
      setStartups(allStartups);
      setStartup(allStartups.find((s) => s.startup_id === startupId) || null);
      setProjects(allProjects);
      setTasks(allTasks.filter((t) => t.startup_id === startupId));
      setPiLinks(pi);
      setInvestors(inv);
      setTeam(tm);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [startupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await api().createProject({
      startup_id: startupId,
      project_name: newProjectName.trim(),
    });
    setNewProjectName("");
    setShowAddProject(false);
    loadData();
  };

  const getProjectOpenTasks = (projectId: string) =>
    tasks.filter((t) => t.project_id === projectId && t.status !== "done").length;

  const getProjectInvestorCount = (projectId: string) =>
    piLinks.filter((pi) => pi.project_id === projectId).length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-200/40 rounded-lg w-48"></div>
          <div className="h-4 bg-brand-200/40 rounded w-24"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-brand-200/40 rounded-2xl"></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="p-8">
        <div className="text-center py-16 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
          <p className="text-red-600 font-medium">Startup not found.</p>
        </div>
      </div>
    );
  }

  const STATUS_BADGE: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    closed: "bg-ink-100 text-ink-500",
  };

  const startupLevelTasks = tasks.filter((t) => !t.project_id);
  const openStartupTasks = startupLevelTasks.filter((t) => t.status !== "done").length;

  const TABS: { key: Tab; label: string }[] = [
    { key: "tasks", label: `Tasks (${openStartupTasks})` },
    { key: "materials", label: "Materials" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-800">{startup.startup_name}</h1>
        <span className={`text-xs px-2.5 py-0.5 rounded-full capitalize mt-1.5 inline-block font-medium ${
          STATUS_BADGE[startup.status] || STATUS_BADGE.active
        }`}>
          {startup.status}
        </span>
      </div>

      {/* Projects Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-700">Projects</h2>
          <button
            onClick={() => setShowAddProject(true)}
            className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
          >
            + Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
            <p className="text-sm text-ink-400 mb-2">No projects yet for this startup.</p>
            <button
              onClick={() => setShowAddProject(true)}
              className="text-sm text-brand-500 hover:text-brand-700 font-medium transition-colors"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.project_id} className="bg-surface-0 border border-brand-200/60 rounded-2xl p-5 hover:border-brand-400 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/projects/${p.project_id}`} className="font-semibold text-ink-800 group-hover:text-brand-700 transition-colors">
                    {p.project_name}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_BADGE[p.status] || STATUS_BADGE.active}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-400 mb-3">
                  <span>{getProjectOpenTasks(p.project_id)} open tasks</span>
                  <span>{getProjectInvestorCount(p.project_id)} investors</span>
                </div>
                <div className="flex gap-3">
                  <Link href={`/projects/${p.project_id}`} className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                    Open Funnel
                  </Link>
                  <Link href={`/projects/${p.project_id}?tab=tasks`} className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                    Tasks
                  </Link>
                  <Link href={`/projects/${p.project_id}?tab=materials`} className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                    Materials
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-brand-200/60 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-400 hover:text-ink-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div>
          <p className="text-xs text-ink-400 mb-3">
            Showing startup-level tasks (not assigned to a specific project).
            Project-specific tasks are in each project&apos;s detail page.
          </p>
          <TasksTab startupId={startupId} tasks={startupLevelTasks} team={team} startups={startups} onRefresh={loadData} />
        </div>
      )}
      {tab === "materials" && (
        <MaterialsTab startup={startup} onRefresh={loadData} />
      )}

      {/* Add Project Modal */}
      <Modal open={showAddProject} onClose={() => setShowAddProject(false)} title="Add Project">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Project Name *</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="e.g. Series A Round"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddProject(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors font-medium"
            >
              Create
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
