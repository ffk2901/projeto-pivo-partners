"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Startup, Task, Project } from "@/types";
import Modal from "@/components/Modal";

export default function StartupsPage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [s, t, p] = await Promise.all([
        api().getStartups(),
        api().getTasks(),
        api().getProjects(),
      ]);
      setStartups(s);
      setTasks(t);
      setProjects(p);
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
    if (!newName.trim()) return;
    await api().createStartup({ startup_name: newName.trim() });
    setNewName("");
    setShowAdd(false);
    loadData();
  };

  const getOpenTaskCount = (id: string) =>
    tasks.filter((t) => t.startup_id === id && t.status !== "done").length;

  const getProjectCount = (id: string) =>
    projects.filter((p) => p.startup_id === id).length;

  const getMaterialsCount = (s: Startup) =>
    [s.pitch_deck_url, s.data_room_url, s.pl_url, s.investment_memo_url].filter(Boolean).length;

  const filtered = startups.filter((s) =>
    s.startup_name.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_BADGE = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    closed: "bg-ink-100 text-ink-500",
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-200/40 rounded-lg w-48"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-brand-200/40 rounded-2xl"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink-800">Startups</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
        >
          + Add Startup
        </button>
      </div>

      <input
        type="text"
        placeholder="Search startups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-brand-200 rounded-xl px-4 py-2.5 text-sm mb-6 bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-ink-400"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <Link
            key={s.startup_id}
            href={`/startups/${s.startup_id}`}
            className="bg-surface-0 border border-brand-200/60 rounded-2xl p-5 hover:border-brand-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-ink-800 group-hover:text-brand-700 transition-colors">{s.startup_name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_BADGE[s.status] || STATUS_BADGE.active}`}>
                {s.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-400">
              <span>{getOpenTaskCount(s.startup_id)} open tasks</span>
              <span>{getProjectCount(s.startup_id)} projects</span>
              <span>{getMaterialsCount(s)}/4 materials</span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
          <p className="text-sm text-ink-400">
            {search ? "No startups match your search." : "No startups yet."}
          </p>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Startup">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Startup Name *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="e.g. Acme Corp"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium">Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
