"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Project, Startup, Task, ProjectInvestor } from "@/types";
import Modal from "@/components/Modal";
import FunnelHub from "@/components/FunnelHub";

type ViewTab = "funnels" | "list";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [piLinks, setPiLinks] = useState<ProjectInvestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStartup, setFilterStartup] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("funnels");

  // Add project modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStartupId, setNewStartupId] = useState("");
  const [newStatus, setNewStatus] = useState<"active" | "paused" | "closed">("active");

  const loadData = useCallback(async () => {
    try {
      const [p, s, t, pi] = await Promise.all([
        api().getProjects(),
        api().getStartups(),
        api().getTasks(),
        api().getProjectInvestors(),
      ]);
      setProjects(p);
      setStartups(s);
      setTasks(t);
      setPiLinks(pi);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!newName.trim() || !newStartupId) return;
    await api().createProject({
      startup_id: newStartupId,
      project_name: newName.trim(),
      status: newStatus,
    });
    setNewName("");
    setNewStartupId("");
    setNewStatus("active");
    setShowAdd(false);
    loadData();
  };

  const getStartupName = (id: string) =>
    startups.find((s) => s.startup_id === id)?.startup_name || "Unknown";

  const getOpenTaskCount = (projectId: string) =>
    tasks.filter((t) => t.project_id === projectId && t.status !== "done").length;

  const getInvestorCount = (projectId: string) =>
    piLinks.filter((pi) => pi.project_id === projectId).length;

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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-200/40 rounded-lg w-48"></div>
          <div className="h-10 bg-brand-200/40 rounded-lg w-80"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-brand-200/40 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink-800">Projects</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
        >
          + Add Project
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setViewTab("funnels")}
          className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors ${
            viewTab === "funnels"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-ink-500 bg-surface-0 border border-brand-200/60 hover:bg-brand-50"
          }`}
        >
          Funnels
        </button>
        <button
          onClick={() => setViewTab("list")}
          className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors ${
            viewTab === "list"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-ink-500 bg-surface-0 border border-brand-200/60 hover:bg-brand-50"
          }`}
        >
          List View
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by project or startup name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-brand-200 rounded-xl px-4 py-2.5 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-ink-400"
        />
        <select
          value={filterStartup}
          onChange={(e) => setFilterStartup(e.target.value)}
          className="border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
        >
          <option value="">All Startups</option>
          {startups.map((s) => (
            <option key={s.startup_id} value={s.startup_id}>{s.startup_name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Funnel Hub view */}
      {viewTab === "funnels" && (
        <FunnelHub
          projects={projects}
          startups={startups}
          piLinks={piLinks}
          search={search}
          filterStartup={filterStartup}
          filterStatus={filterStatus}
        />
      )}

      {/* List view */}
      {viewTab === "list" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link
                key={p.project_id}
                href={`/projects/${p.project_id}`}
                className="bg-surface-0 border border-brand-200/60 rounded-2xl p-5 hover:border-brand-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-ink-800 group-hover:text-brand-700 transition-colors">{p.project_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                    STATUS_BADGE[p.status] || STATUS_BADGE.active
                  }`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-ink-400 mb-3">{getStartupName(p.startup_id)}</p>
                <div className="flex items-center gap-4 text-xs text-ink-400">
                  <span>{getOpenTaskCount(p.project_id)} open tasks</span>
                  <span>{getInvestorCount(p.project_id)} investors</span>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
              <p className="text-sm text-ink-400">
                {search || filterStartup || filterStatus
                  ? "No projects match your filters."
                  : "No projects yet."}
              </p>
            </div>
          )}
        </>
      )}

      {/* Add project modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Project">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Startup *</label>
            <select
              value={newStartupId}
              onChange={(e) => setNewStartupId(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="">-- Select Startup --</option>
              {startups.map((s) => (
                <option key={s.startup_id} value={s.startup_id}>{s.startup_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Project Name *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="e.g. Series A Round"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as "active" | "paused" | "closed")}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || !newStartupId}
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
