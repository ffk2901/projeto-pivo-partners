"use client";

import Link from "next/link";
import type { Project, Startup, ProjectInvestor } from "@/types";
import { FUNNEL_STAGES } from "@/types";

interface Props {
  projects: Project[];
  startups: Startup[];
  piLinks: ProjectInvestor[];
  search: string;
  filterStartup: string;
  filterStatus: string;
}

export default function FunnelHub({ projects, startups, piLinks, search, filterStartup, filterStatus }: Props) {
  const getStartupName = (id: string) =>
    startups.find((s) => s.startup_id === id)?.startup_name || "Unknown";

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.project_name.toLowerCase().includes(q) ||
      getStartupName(p.startup_id).toLowerCase().includes(q);
    const matchesStartup = !filterStartup || p.startup_id === filterStartup;
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStartup && matchesStatus;
  });

  const STATUS_BADGE: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    closed: "bg-ink-100 text-ink-500",
  };

  // Stage colors for mini-badges
  const stageColor: Record<string, string> = {
    "Pipeline": "bg-brand-300/50 text-brand-700",
    "On Hold": "bg-amber-100 text-amber-700",
    "Trying to reach": "bg-blue-100 text-blue-700",
    "Active": "bg-emerald-100 text-emerald-700",
    "Advanced": "bg-purple-100 text-purple-700",
    "Declined": "bg-red-100 text-red-700",
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
        <p className="text-ink-400 text-sm">
          {search || filterStartup || filterStatus
            ? "No funnels match your filters."
            : "No funnels yet. Create a project to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {filtered.map((p) => {
        const projectLinks = piLinks.filter((l) => l.project_id === p.project_id);
        const stageCounts: Record<string, number> = {};
        for (const stage of FUNNEL_STAGES) {
          const count = projectLinks.filter((l) => l.stage === stage).length;
          if (count > 0) stageCounts[stage] = count;
        }

        return (
          <Link
            key={p.project_id}
            href={`/projects/${p.project_id}`}
            className="bg-surface-0 border border-brand-200/60 rounded-2xl p-5 hover:border-brand-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-1.5">
              <h3 className="font-semibold text-ink-800 group-hover:text-brand-700 transition-colors">
                {p.project_name}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                STATUS_BADGE[p.status] || STATUS_BADGE.active
              }`}>
                {p.status}
              </span>
            </div>
            <p className="text-xs text-ink-400 mb-3">{getStartupName(p.startup_id)}</p>

            {/* Stage summary */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-bold text-ink-800">{projectLinks.length}</span>
              <span className="text-xs text-ink-400">investor{projectLinks.length !== 1 ? "s" : ""}</span>
            </div>

            {Object.keys(stageCounts).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {FUNNEL_STAGES.filter((s) => stageCounts[s]).map((stage) => (
                  <span
                    key={stage}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${stageColor[stage] || "bg-brand-100 text-brand-600"}`}
                  >
                    {stage}: {stageCounts[stage]}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-300 italic">No investors added yet</p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
