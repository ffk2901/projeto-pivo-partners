"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectAccess {
  project_id: string;
  permission_level: "view" | "edit";
}

interface ProjectInfo {
  project_id: string;
  project_name: string;
  startup_name: string;
  status: string;
  investor_count: number;
  permission_level: "view" | "edit";
}

export default function PortalPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const me = await meRes.json();
        if (me.error) { router.push("/login"); return; }
        if (me.role === "admin") { router.push("/"); return; }

        const accessList: ProjectAccess[] = me.projects || [];
        if (accessList.length === 0) {
          setProjects([]);
          setLoading(false);
          return;
        }

        if (accessList.length === 1) {
          router.push(`/portal/project/${accessList[0].project_id}`);
          return;
        }

        // Fetch project details for each
        const projectInfos: ProjectInfo[] = [];
        for (const access of accessList) {
          try {
            const res = await fetch(`/api/portal/project?project_id=${access.project_id}`, { cache: "no-store" });
            const data = await res.json();
            if (data.project) {
              projectInfos.push({
                project_id: data.project.project_id,
                project_name: data.project.project_name,
                startup_name: data.startup?.startup_name || "",
                status: data.project.status,
                investor_count: data.investor_count || 0,
                permission_level: access.permission_level,
              });
            }
          } catch { /* skip */ }
        }
        setProjects(projectInfos);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-200/40 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-brand-200/40 rounded-2xl"></div>
            <div className="h-32 bg-brand-200/40 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-16 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
          <p className="text-ink-400 text-sm">No projects assigned to your account yet.</p>
          <p className="text-ink-300 text-xs mt-1">Contact Pivo Partners for access.</p>
        </div>
      </div>
    );
  }

  const STATUS_BADGE: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    closed: "bg-ink-100 text-ink-500",
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-ink-800 mb-6">Your Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p) => (
          <button
            key={p.project_id}
            onClick={() => router.push(`/portal/project/${p.project_id}`)}
            className="text-left bg-surface-0 border border-brand-200/60 rounded-2xl p-5 hover:border-brand-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-semibold text-ink-800 group-hover:text-brand-600 transition-colors">
                {p.project_name}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_BADGE[p.status] || STATUS_BADGE.active}`}>
                {p.status}
              </span>
            </div>
            <p className="text-sm text-ink-400">{p.startup_name}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-ink-400">
              <span>{p.investor_count} investors</span>
              <span className={`px-1.5 py-0.5 rounded ${p.permission_level === "edit" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                {p.permission_level}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
