"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  ProjectNote,
  Meeting,
} from "@/types";
import FunnelBoard from "@/components/FunnelBoard";
import TasksTab from "@/components/TasksTab";
import MaterialsTab from "@/components/MaterialsTab";
import NotesTable from "@/components/NotesTable";
import MeetingReportTab from "@/components/MeetingReportTab";
import MeetingNotesTab from "@/components/MeetingNotesTab";
import Investor360Drawer from "@/components/Investor360Drawer";
import StageEditor from "@/components/StageEditor";

type Tab = "pipeline" | "tasks" | "notes" | "meeting-notes" | "materials" | "report";

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
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tab, setTab] = useState<Tab>("pipeline");
  const [loading, setLoading] = useState(true);
  const [showStartupTasks, setShowStartupTasks] = useState(false);

  // Investor 360 Drawer state
  const [drawerLink, setDrawerLink] = useState<ProjectInvestor | null>(null);
  const [drawerInvestor, setDrawerInvestor] = useState<Investor | null>(null);

  // Stage Editor state
  const [showStageEditor, setShowStageEditor] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allProjects, allStartups, allTasks, pi, inv, tm, cfg, pnotes, mtgs] =
        await Promise.all([
          api().getProjects(),
          api().getStartups(),
          api().getTasks(),
          api().getProjectInvestors(projectId),
          api().getInvestors(),
          api().getTeam(),
          api().getConfig(),
          api().getProjectNotes(projectId),
          api().getMeetings(projectId),
        ]);

      const proj = allProjects.find((p) => p.project_id === projectId) || null;
      setProject(proj);
      setStartups(allStartups);
      setStartup(
        proj
          ? allStartups.find((s) => s.startup_id === proj.startup_id) || null
          : null
      );

      const projectTasks = allTasks.filter((t) => t.project_id === projectId);
      const startupTasks = proj
        ? allTasks.filter(
            (t) => t.startup_id === proj.startup_id && !t.project_id
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
      setNotes(pnotes);
      setMeetings(mtgs);

      // Update drawer link if it's open (to reflect latest data)
      setDrawerLink((prev) => {
        if (!prev) return null;
        const updatedLink = pi.find((l) => l.link_id === prev.link_id);
        return updatedLink || prev;
      });
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, showStartupTasks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDrawer = useCallback((link: ProjectInvestor) => {
    const investor = investors.find((i) => i.investor_id === link.investor_id) || null;
    setDrawerLink(link);
    setDrawerInvestor(investor);
  }, [investors]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerLink(null);
    setDrawerInvestor(null);
  }, []);

  // Compute investor count per stage for this project
  const investorCountByStage = useMemo(() => {
    const counts: Record<string, number> = {};
    piLinks.forEach((l) => {
      counts[l.stage] = (counts[l.stage] || 0) + 1;
    });
    return counts;
  }, [piLinks]);

  const handleSaveStages = useCallback(async (newStages: string[]) => {
    // Move investors from deleted stages to the first new stage
    const deletedStages = stages.filter((s) => !newStages.includes(s));
    const firstStage = newStages[0];
    for (const oldStage of deletedStages) {
      const affected = piLinks.filter((l) => l.stage === oldStage);
      for (const link of affected) {
        await api().updateProjectInvestor({ link_id: link.link_id, stage: firstStage });
      }
    }
    // Rename: if a stage was renamed, investors keep the old stage name.
    // We handle this by checking for investors with stages not in the new list.
    // (Already covered above since renamed stages = old name deleted + new name added)

    // Save the new stages config
    await api().updatePipelineStages(newStages);
    setStages(newStages);
    await loadData();
  }, [stages, piLinks, loadData]);

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

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center py-16 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
          <p className="text-red-600 font-medium mb-2">Project not found</p>
          <button
            onClick={() => router.push("/projects")}
            className="text-sm text-brand-500 hover:text-brand-700 font-medium transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

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
    { key: "meeting-notes", label: "Meeting Notes" },
    { key: "materials", label: "Materials" },
    { key: "report", label: "Meeting Report" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-ink-400 mb-2">
          <Link href="/startups" className="hover:text-ink-600 transition-colors">Startups</Link>
          <span>/</span>
          {startup && (
            <>
              <Link href={`/startups/${startup.startup_id}`} className="hover:text-ink-600 transition-colors">
                {startup.startup_name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-ink-600">{project.project_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink-800">{project.project_name}</h1>
          <span className={`text-xs px-2.5 py-0.5 rounded-full capitalize font-medium ${
            STATUS_BADGE[project.status] || STATUS_BADGE.active
          }`}>
            {project.status}
          </span>
        </div>
        {startup && (
          <p className="text-sm text-ink-400 mt-1">Startup: {startup.startup_name}</p>
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

      {tab === "pipeline" && (
        <>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowStageEditor(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-2xl text-md-on_surface_variant hover:bg-md-surface_container_high transition-colors"
              style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Edit Funnel
            </button>
          </div>
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
          />
          <StageEditor
            open={showStageEditor}
            onClose={() => setShowStageEditor(false)}
            stages={stages}
            investorCountByStage={investorCountByStage}
            onSave={handleSaveStages}
          />
        </>
      )}
      {tab === "tasks" && (
        <div>
          <div className="mb-3">
            <label className="flex items-center gap-2 text-xs text-ink-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showStartupTasks}
                onChange={(e) => setShowStartupTasks(e.target.checked)}
                className="rounded border-brand-300 text-brand-500 focus:ring-brand-500/40"
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
      {tab === "notes" && (
        <NotesTable
          projectId={projectId}
          notes={notes}
          team={team}
          investors={investors}
          piLinks={piLinks}
          meetings={meetings}
          onRefresh={loadData}
        />
      )}
      {tab === "meeting-notes" && (
        <MeetingNotesTab
          projectId={projectId}
          startupId={project.startup_id}
          investors={investors}
          onRefresh={loadData}
        />
      )}
      {tab === "materials" && startup && (
        <MaterialsTab startup={startup} onRefresh={loadData} />
      )}
      {tab === "report" && (
        <MeetingReportTab projectId={projectId} />
      )}

      {/* Investor 360 Drawer */}
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
        />
      )}
    </div>
  );
}
