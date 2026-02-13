"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  Project,
  Startup,
  Task,
  ProjectInvestor,
  Investor,
  TeamMember,
} from "@/types";
import PipelineTab from "@/components/PipelineTab";
import TasksTab from "@/components/TasksTab";
import MaterialsTab from "@/components/MaterialsTab";

type Tab = "pipeline" | "tasks" | "materials";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [startup, setStartup] = useState<Startup | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [piLinks, setPiLinks] = useState<ProjectInvestor[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("pipeline");
  const [loading, setLoading] = useState(true);
  const [showStartupTasks, setShowStartupTasks] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allProjects, allStartups, allTasks, pi, inv, tm, cfg] =
        await Promise.all([
          api().getProjects(),
          api().getStartups(),
          api().getTasks(),
          api().getProjectInvestors(projectId),
          api().getInvestors(),
          api().getTeam(),
          api().getConfig(),
        ]);

      const proj = allProjects.find((p) => p.project_id === projectId) || null;
      setProject(proj);
      setStartups(allStartups);
      setStartup(
        proj
          ? allStartups.find((s) => s.startup_id === proj.startup_id) || null
          : null
      );

      // Show project-scoped tasks; optionally include startup-level tasks
      const projectTasks = allTasks.filter((t) => t.project_id === projectId);
      const startupTasks = proj
        ? allTasks.filter(
            (t) =>
              t.startup_id === proj.startup_id && !t.project_id
          )
        : [];
      setTasks(
        showStartupTasks
          ? [...projectTasks, ...startupTasks]
          : projectTasks
      );

      setPiLinks(pi);
      setInvestors(inv);
      setTeam(tm);
      setStages(cfg.pipeline_stages);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, showStartupTasks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-red-500">Project not found.</p>
        <button
          onClick={() => router.push("/projects")}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const STATUS_BADGE: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    closed: "bg-gray-100 text-gray-500",
  };

  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  const TABS: { key: Tab; label: string }[] = [
    { key: "pipeline", label: `Pipeline (${piLinks.length})` },
    { key: "tasks", label: `Tasks (${openTaskCount})` },
    { key: "materials", label: "Materials" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/startups" className="hover:text-gray-600">
            Startups
          </Link>
          <span>/</span>
          {startup && (
            <>
              <Link
                href={`/startups/${startup.startup_id}`}
                className="hover:text-gray-600"
              >
                {startup.startup_name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-600">{project.project_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">
            {project.project_name}
          </h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full capitalize ${
              STATUS_BADGE[project.status] || STATUS_BADGE.active
            }`}
          >
            {project.status}
          </span>
        </div>
        {startup && (
          <p className="text-sm text-gray-400 mt-1">
            Startup: {startup.startup_name}
          </p>
        )}
      </div>

      {/* Tabs */}
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

      {tab === "pipeline" && (
        <PipelineTab
          projectId={projectId}
          links={piLinks}
          investors={investors}
          stages={stages}
          onRefresh={loadData}
        />
      )}
      {tab === "tasks" && (
        <div>
          <div className="mb-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showStartupTasks}
                onChange={(e) => setShowStartupTasks(e.target.checked)}
                className="rounded border-gray-300"
              />
              Include startup-level tasks
            </label>
          </div>
          <TasksTab
            startupId={project.startup_id}
            tasks={tasks}
            team={team}
            startups={startups}
            onRefresh={loadData}
          />
        </div>
      )}
      {tab === "materials" && startup && (
        <MaterialsTab startup={startup} onRefresh={loadData} />
      )}
    </div>
  );
}
