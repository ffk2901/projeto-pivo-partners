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

  // Add project modal
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
    tasks.filter(
      (t) => t.project_id === projectId && t.status !== "done"
    ).length;

  const getProjectInvestorCount = (projectId: string) =>
    piLinks.filter((pi) => pi.project_id === projectId).length;

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="p-8">
        <p className="text-red-500">Startup not found.</p>
      </div>
    );
  }

  const STATUS_BADGE: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    closed: "bg-gray-100 text-gray-500",
  };

  const startupLevelTasks = tasks.filter((t) => !t.project_id);
  const openStartupTasks = startupLevelTasks.filter(
    (t) => t.status !== "done"
  ).length;

  const TABS: { key: Tab; label: string }[] = [
    { key: "tasks", label: `Tasks (${openStartupTasks})` },
    { key: "materials", label: "Materials" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {startup.startup_name}
        </h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize mt-1 inline-block ${
            STATUS_BADGE[startup.status] || STATUS_BADGE.active
          }`}
        >
          {startup.status}
        </span>
      </div>

      {/* Projects Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Projects</h2>
          <button
            onClick={() => setShowAddProject(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-400 mb-2">
              No projects yet for this startup.
            </p>
            <button
              onClick={() => setShowAddProject(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.project_id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/projects/${p.project_id}`}
                    className="font-semibold text-gray-800 hover:text-blue-600"
                  >
                    {p.project_name}
                  </Link>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      STATUS_BADGE[p.status] || STATUS_BADGE.active
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  <span>
                    {getProjectOpenTasks(p.project_id)} open tasks
                  </span>
                  <span>
                    {getProjectInvestorCount(p.project_id)} investors
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${p.project_id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open Pipeline
                  </Link>
                  <Link
                    href={`/projects/${p.project_id}?tab=tasks`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open Tasks
                  </Link>
                  <Link
                    href={`/projects/${p.project_id}?tab=materials`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open Materials
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs for startup-level tasks and materials */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div>
          <p className="text-xs text-gray-400 mb-3">
            Showing startup-level tasks (not assigned to a specific project).
            Project-specific tasks are in each project&apos;s detail page.
          </p>
          <TasksTab
            startupId={startupId}
            tasks={startupLevelTasks}
            team={team}
            startups={startups}
            onRefresh={loadData}
          />
        </div>
      )}
      {tab === "materials" && (
        <MaterialsTab startup={startup} onRefresh={loadData} />
      )}

      {/* Add Project Modal */}
      <Modal
        open={showAddProject}
        onClose={() => setShowAddProject(false)}
        title="Add Project"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Series A Round"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddProject(false)}
              className="px-4 py-2 text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
