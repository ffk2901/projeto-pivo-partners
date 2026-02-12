"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type {
  Startup,
  Task,
  StartupInvestor,
  Investor,
  TeamMember,
} from "@/types";
import PipelineTab from "@/components/PipelineTab";
import TasksTab from "@/components/TasksTab";
import MaterialsTab from "@/components/MaterialsTab";

type Tab = "pipeline" | "tasks" | "materials";

export default function StartupDetailPage() {
  const params = useParams();
  const startupId = params.id as string;

  const [startup, setStartup] = useState<Startup | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [links, setLinks] = useState<StartupInvestor[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [tab, setTab] = useState<Tab>("pipeline");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [allStartups, allTasks, si, inv, tm, cfg] = await Promise.all([
        api().getStartups(),
        api().getTasks(),
        api().getStartupInvestors(startupId),
        api().getInvestors(),
        api().getTeam(),
        api().getConfig(),
      ]);
      setStartups(allStartups);
      setStartup(allStartups.find((s) => s.startup_id === startupId) || null);
      setTasks(allTasks.filter((t) => t.startup_id === startupId));
      setLinks(si);
      setInvestors(inv);
      setTeam(tm);
      setStages(cfg.pipeline_stages);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [startupId]);

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

  if (!startup) {
    return (
      <div className="p-8">
        <p className="text-red-500">Startup not found.</p>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "pipeline", label: "Pipeline" },
    { key: "tasks", label: `Tasks (${tasks.filter((t) => t.status !== "done").length})` },
    { key: "materials", label: "Materials" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {startup.startup_name}
        </h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize mt-1 inline-block ${
            startup.status === "active"
              ? "bg-green-100 text-green-700"
              : startup.status === "paused"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {startup.status}
        </span>
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
          startupId={startupId}
          links={links}
          investors={investors}
          stages={stages}
          onRefresh={loadData}
        />
      )}
      {tab === "tasks" && (
        <TasksTab
          startupId={startupId}
          tasks={tasks}
          team={team}
          startups={startups}
          onRefresh={loadData}
        />
      )}
      {tab === "materials" && (
        <MaterialsTab startup={startup} onRefresh={loadData} />
      )}
    </div>
  );
}
