"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type {
  Project,
  Startup,
  Task,
  ProjectInvestor,
  Investor,
  TeamMember,
  ProjectNote,
  Meeting,
} from "@/types";
import FunnelBoard from "@/components/FunnelBoard";
import TasksTab from "@/components/TasksTab";
import NotesTable from "@/components/NotesTable";
import MaterialsTab from "@/components/MaterialsTab";
import MeetingReportTab from "@/components/MeetingReportTab";
import Investor360Drawer from "@/components/Investor360Drawer";

type Tab = "pipeline" | "tasks" | "notes" | "materials" | "report";

export default function PortalProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [startup, setStartup] = useState<Startup | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [piLinks, setPiLinks] = useState<ProjectInvestor[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tab, setTab] = useState<Tab>("pipeline");
  const [loading, setLoading] = useState(true);
  const [permissionLevel, setPermissionLevel] = useState<"view" | "edit">("view");
  const [accessError, setAccessError] = useState<string | null>(null);

  const [drawerLink, setDrawerLink] = useState<ProjectInvestor | null>(null);
  const [drawerInvestor, setDrawerInvestor] = useState<Investor | null>(null);

  const portalApi = api("/api/portal");

  const loadData = useCallback(async () => {
    try {
      // First check access
      const projectRes = await fetch(`/api/portal/project?project_id=${projectId}`, { cache: "no-store" });
      if (!projectRes.ok) {
        if (projectRes.status === 403) {
          setAccessError("You don't have access to this project.");
          setLoading(false);
          return;
        }
        throw new Error("Failed to load project");
      }
      const projectData = await projectRes.json();
      setProject(projectData.project);
      setStartup(projectData.startup || null);
      setPermissionLevel(projectData.permission_level || "view");

      const [pi, inv, tm, cfg, pnotes, mtgs, taskData] = await Promise.all([
        portalApi.getProjectInvestors(projectId),
        portalApi.getInvestors(),
        portalApi.getTeam(),
        portalApi.getConfig(),
        portalApi.getProjectNotes(projectId),
        portalApi.getMeetings(projectId),
        portalApi.getTasks(),
      ]);

      setPiLinks(pi);
      setInvestors(inv);
      setTeam(tm);
      setStages(cfg.pipeline_stages);
      setNotes(pnotes);
      setMeetings(mtgs);
      setTasks(taskData.filter((t: Task) => t.project_id === projectId));

      setDrawerLink((prev) => {
        if (!prev) return null;
        const updatedLink = pi.find((l: ProjectInvestor) => l.link_id === prev.link_id);
        return updatedLink || prev;
      });
    } catch (err) {
      console.error("Failed to load:", err);
      setAccessError("Failed to load project data.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenDrawer = useCallback((link: ProjectInvestor) => {
    const investor = investors.find((i) => i.investor_id === link.investor_id) || null;
    setDrawerLink(link);
    setDrawerInvestor(investor);
  }, [investors]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerLink(null);
    setDrawerInvestor(null);
  }, []);

  const readOnly = permissionLevel === "view";

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-brand-200/40 rounded w-64"></div>
          <div className="h-8 bg-brand-200/40 rounded w-48"></div>
          <div className="h-96 bg-brand-200/40 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="p-8">
        <div className="text-center py-16 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
          <p className="text-red-600 font-medium mb-2">{accessError}</p>
          <button onClick={() => router.push("/portal")} className="text-sm text-brand-500 hover:text-brand-700 font-medium transition-colors">
            Back to Portal
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const STATUS_BADGE: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    closed: "bg-ink-100 text-ink-500",
  };

  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  const TABS: { key: Tab; label: string }[] = [
    { key: "pipeline", label: `Funnel (${piLinks.length})` },
    { key: "tasks", label: `Tasks (${openTaskCount})` },
    { key: "notes", label: `Notes (${notes.length})` },
    { key: "materials", label: "Materials" },
    { key: "report", label: "Meeting Report" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-ink-400 mb-2">
          <button onClick={() => router.push("/portal")} className="hover:text-ink-600 transition-colors">Portal</button>
          <span>/</span>
          <span className="text-ink-600">{project.project_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink-800">{project.project_name}</h1>
          <span className={`text-xs px-2.5 py-0.5 rounded-full capitalize font-medium ${STATUS_BADGE[project.status] || STATUS_BADGE.active}`}>
            {project.status}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${readOnly ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
            {readOnly ? "View Only" : "Full Access"}
          </span>
        </div>
        {startup && <p className="text-sm text-ink-400 mt-1">Startup: {startup.startup_name}</p>}
      </div>

      <div className="flex gap-1 border-b border-brand-200/60 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-400 hover:text-ink-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pipeline" && (
        <FunnelBoard
          projectId={projectId}
          links={piLinks}
          investors={investors}
          stages={stages}
          team={team}
          notes={notes}
          tasks={tasks}
          meetings={meetings}
          onRefresh={loadData}
          onOpenDrawer={handleOpenDrawer}
          readOnly={readOnly}
          apiPrefix="/api/portal"
        />
      )}
      {tab === "tasks" && (
        <TasksTab
          startupId={project.startup_id}
          tasks={tasks}
          team={team}
          startups={startup ? [startup] : []}
          onRefresh={loadData}
          readOnly={readOnly}
          apiPrefix="/api/portal"
        />
      )}
      {tab === "notes" && (
        <NotesTable
          projectId={projectId}
          notes={notes}
          team={team}
          investors={investors}
          piLinks={piLinks}
          meetings={meetings}
          onRefresh={loadData}
          readOnly={readOnly}
          apiPrefix="/api/portal"
        />
      )}
      {tab === "materials" && startup && (
        <MaterialsTab startup={startup} onRefresh={loadData} readOnly={readOnly} apiPrefix="/api/portal" />
      )}
      {tab === "report" && (
        <MeetingReportTab projectId={projectId} apiPrefix="/api/portal" />
      )}

      {drawerLink && drawerInvestor && (
        <Investor360Drawer
          open={!!drawerLink}
          onClose={handleCloseDrawer}
          link={drawerLink}
          investor={drawerInvestor}
          projectId={projectId}
          stages={stages}
          team={team}
          onRefresh={loadData}
          readOnly={readOnly}
          apiPrefix="/api/portal"
        />
      )}
    </div>
  );
}
