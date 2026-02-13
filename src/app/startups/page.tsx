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
    [s.pitch_deck_url, s.data_room_url, s.pl_url, s.investment_memo_url].filter(
      Boolean
    ).length;

  const filtered = startups.filter((s) =>
    s.startup_name.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_BADGE = {
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    closed: "bg-gray-100 text-gray-500",
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Startups</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Startup
        </button>
      </div>

      <input
        type="text"
        placeholder="Search startups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <Link
            key={s.startup_id}
            href={`/startups/${s.startup_id}`}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-800">
                {s.startup_name}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                  STATUS_BADGE[s.status] || STATUS_BADGE.active
                }`}
              >
                {s.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{getOpenTaskCount(s.startup_id)} open tasks</span>
              <span>{getProjectCount(s.startup_id)} projects</span>
              <span>{getMaterialsCount(s)}/4 materials</span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 mt-4">
          {search ? "No startups match your search." : "No startups yet."}
        </p>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Startup"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Startup Name *
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Acme Corp"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
