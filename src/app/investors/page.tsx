"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Investor, ProjectInvestor, Project, Startup } from "@/types";
import Modal from "@/components/Modal";

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [piLinks, setPiLinks] = useState<ProjectInvestor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<Investor | null>(null);

  const [newName, setNewName] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLinkedin, setNewLinkedin] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [inv, pi, prj, st] = await Promise.all([
        api().getInvestors(),
        api().getProjectInvestors(),
        api().getProjects(),
        api().getStartups(),
      ]);
      setInvestors(inv);
      setPiLinks(pi);
      setProjects(prj);
      setStartups(st);
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
    await api().createInvestor({
      investor_name: newName.trim(),
      tags: newTags,
      email: newEmail,
      linkedin: newLinkedin,
    });
    setNewName(""); setNewTags(""); setNewEmail(""); setNewLinkedin("");
    setShowAdd(false);
    loadData();
  };

  const getProjectCount = (id: string) =>
    piLinks.filter((l) => l.investor_id === id).length;

  const getInvestorProjects = (id: string) => {
    return piLinks
      .filter((l) => l.investor_id === id)
      .map((l) => {
        const project = projects.find((p) => p.project_id === l.project_id);
        const startup = project ? startups.find((s) => s.startup_id === project.startup_id) : null;
        return { project, startup, stage: l.stage, last_update: l.last_update, notes: l.notes };
      })
      .filter((x) => x.project);
  };

  const filtered = investors.filter((i) => {
    const q = search.toLowerCase();
    return i.investor_name.toLowerCase().includes(q) || i.tags.toLowerCase().includes(q);
  });

  // Stage-specific colors for badges
  const stageColor: Record<string, string> = {
    "Pipeline": "bg-brand-300/50 text-brand-700",
    "On Hold": "bg-amber-100 text-amber-700",
    "Trying to reach": "bg-blue-100 text-blue-700",
    "Active": "bg-emerald-100 text-emerald-700",
    "Advanced": "bg-purple-100 text-purple-700",
    "Declined": "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-200/40 rounded-lg w-48"></div>
          <div className="h-10 bg-brand-200/40 rounded-lg w-80"></div>
          <div className="h-64 bg-brand-200/40 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink-800">Investors Directory</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
        >
          + Add Investor
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name or tags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-brand-200 rounded-xl px-4 py-2.5 text-sm mb-6 bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-ink-400"
      />

      <div className="bg-surface-0 border border-brand-200/60 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-50 border-b border-brand-200/40">
              <th className="text-left px-5 py-3.5 font-medium text-ink-600">Name</th>
              <th className="text-left px-5 py-3.5 font-medium text-ink-600">Tags</th>
              <th className="text-left px-5 py-3.5 font-medium text-ink-600">Contact</th>
              <th className="text-center px-5 py-3.5 font-medium text-ink-600">Projects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {filtered.map((inv) => (
              <tr
                key={inv.investor_id}
                className="hover:bg-brand-50/50 cursor-pointer transition-colors"
                onClick={() => setShowDetail(inv)}
              >
                <td className="px-5 py-3.5 font-medium text-ink-800">{inv.investor_name}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {inv.tags && inv.tags.split(";").filter(Boolean).map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-ink-500 text-xs">
                  {inv.email && <div>{inv.email}</div>}
                  {inv.linkedin && (
                    <a
                      href={inv.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 hover:text-brand-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      LinkedIn
                    </a>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-xs font-medium text-ink-600 bg-brand-100 px-2 py-0.5 rounded-lg">
                    {getProjectCount(inv.investor_id)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-ink-400">
              {search ? "No investors match your search." : "No investors yet."}
            </p>
          </div>
        )}
      </div>

      {/* Add investor modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Investor">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Name *</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="e.g. Sequoia Capital" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Tags (semicolon-separated)</label>
            <input type="text" value={newTags} onChange={(e) => setNewTags(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="e.g. VC;Series A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Email</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">LinkedIn URL</label>
            <input type="url" value={newLinkedin} onChange={(e) => setNewLinkedin(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={!newName.trim()}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors font-medium">Create</button>
          </div>
        </div>
      </Modal>

      {/* Investor detail modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail?.investor_name || "Investor Details"} wide>
        {showDetail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {showDetail.email && (
                <div>
                  <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm text-ink-700">{showDetail.email}</p>
                </div>
              )}
              {showDetail.linkedin && (
                <div>
                  <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">LinkedIn</p>
                  <a href={showDetail.linkedin} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-brand-500 hover:text-brand-700 break-all transition-colors">
                    {showDetail.linkedin}
                  </a>
                </div>
              )}
            </div>

            {showDetail.tags && (
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {showDetail.tags.split(";").filter(Boolean).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-brand-100 text-brand-600 rounded-lg font-medium">{tag.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {showDetail.notes && (
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-ink-700 whitespace-pre-wrap">{showDetail.notes}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-ink-400 uppercase tracking-wide mb-2">Project Relationships</p>
              {getInvestorProjects(showDetail.investor_id).length === 0 ? (
                <p className="text-sm text-ink-300 italic">Not linked to any projects.</p>
              ) : (
                <div className="space-y-2">
                  {getInvestorProjects(showDetail.investor_id).map(({ project, startup, stage, last_update, notes: linkNotes }) => (
                    <div key={project!.project_id} className="bg-surface-50 border border-brand-200/60 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link href={`/projects/${project!.project_id}`}
                            className="text-sm font-medium text-ink-800 hover:text-brand-600 transition-colors">
                            {project!.project_name}
                          </Link>
                          {startup && <p className="text-xs text-ink-400">{startup.startup_name}</p>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${stageColor[stage] || "bg-brand-100 text-brand-600"}`}>
                          {stage}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-1">
                        {last_update && <span className="text-xs text-ink-400">Updated: {last_update}</span>}
                        {linkNotes && <span className="text-xs text-ink-400">{linkNotes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
