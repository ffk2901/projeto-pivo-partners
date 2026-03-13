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

  // Detail modal: edit mode
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editOrigin, setEditOrigin] = useState<Investor["origin"]>("");

  // Detail modal: delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editType, setEditType] = useState<Investor["investor_type"]>("fund");
  const [editCompany, setEditCompany] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [newName, setNewName] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newType, setNewType] = useState<Investor["investor_type"]>("fund");
  const [newCompany, setNewCompany] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [filterType, setFilterType] = useState<string>("");

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

  // Sync edit fields when detail modal opens
  useEffect(() => {
    if (showDetail) {
      setEditName(showDetail.investor_name);
      setEditTags(showDetail.tags);
      setEditEmail(showDetail.email);
      setEditNotes(showDetail.notes);
      setEditOrigin(showDetail.origin || "");
      setEditType(showDetail.investor_type || "fund");
      setEditCompany(showDetail.company_affiliation || "");
      setEditDescription(showDetail.description || "");
      setDetailEditMode(false);
      setShowDeleteConfirm(false);
      setDeleteError(null);
    }
  }, [showDetail]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await api().createInvestor({
      investor_name: newName.trim(),
      investor_type: newType || "fund",
      tags: newTags,
      email: newEmail,
      company_affiliation: newCompany,
      description: newDescription,
    });
    setNewName(""); setNewTags(""); setNewEmail(""); setNewType("fund"); setNewCompany(""); setNewDescription("");
    setShowAdd(false);
    loadData();
  };

  const handleSaveDetail = async () => {
    if (!showDetail || !editName.trim()) return;
    setSaving(true);
    try {
      await api().updateInvestor({
        investor_id: showDetail.investor_id,
        investor_name: editName.trim(),
        investor_type: editType,
        tags: editTags,
        email: editEmail,
        notes: editNotes,
        origin: editOrigin,
        company_affiliation: editCompany,
        description: editDescription,
      });
      setDetailEditMode(false);
      setShowDetail(null);
      loadData();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvestor = async () => {
    if (!showDetail) return;
    setSaving(true);
    setDeleteError(null);
    try {
      await api().deleteInvestor(showDetail.investor_id);
      setShowDeleteConfirm(false);
      setShowDetail(null);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete investor";
      setDeleteError(message);
    } finally {
      setSaving(false);
    }
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
    const matchesSearch = i.investor_name.toLowerCase().includes(q) || i.tags.toLowerCase().includes(q) || (i.company_affiliation || "").toLowerCase().includes(q);
    const matchesType = !filterType || (i.investor_type || "fund") === filterType;
    return matchesSearch && matchesType;
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

  const inputClass = "w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

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

      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, tags, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-brand-200 rounded-xl px-4 py-2.5 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-ink-400"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-brand-200 rounded-xl px-3 py-2.5 bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="">All Types</option>
          <option value="fund">Funds</option>
          <option value="individual">Individuals</option>
        </select>
      </div>

      <div className="bg-surface-0 border border-brand-200/60 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-50 border-b border-brand-200/40">
              <th className="text-left px-5 py-3.5 font-medium text-ink-600">Name</th>
              <th className="text-left px-5 py-3.5 font-medium text-ink-600">Type</th>
              <th className="text-left px-5 py-3.5 font-medium text-ink-600">Tags</th>
              <th className="text-left px-5 py-3.5 font-medium text-ink-600">Origin</th>
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
                <td className="px-5 py-3.5">
                  <div className="font-medium text-ink-800">{inv.investor_name}</div>
                  {(inv.investor_type === "individual") && inv.company_affiliation && (
                    <div className="text-xs text-ink-400 mt-0.5">via {inv.company_affiliation}</div>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {(inv.investor_type === "individual") ? (
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-medium">Individual</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium">Fund</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {inv.tags && inv.tags.split(";").filter(Boolean).map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {inv.origin === "br" && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md font-medium">BR</span>
                  )}
                  {inv.origin === "intl" && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">INTL</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-500 text-xs">
                  {inv.email && <div>{inv.email}</div>}
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
            <label className="block text-sm font-medium text-ink-700 mb-1">Type</label>
            <div className="flex gap-2">
              <button onClick={() => setNewType("fund")}
                className={`flex-1 px-3 py-2 text-sm rounded-xl border font-medium transition-colors ${newType === "fund" ? "bg-brand-500 text-white border-brand-500" : "bg-surface-0 text-ink-600 border-brand-200 hover:bg-brand-50"}`}>
                Fund
              </button>
              <button onClick={() => setNewType("individual")}
                className={`flex-1 px-3 py-2 text-sm rounded-xl border font-medium transition-colors ${newType === "individual" ? "bg-purple-500 text-white border-purple-500" : "bg-surface-0 text-ink-600 border-brand-200 hover:bg-purple-50"}`}>
                Individual Person
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Name *</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              className={inputClass}
              placeholder={newType === "individual" ? "e.g. João Silva" : "e.g. Sequoia Capital"} />
          </div>
          {newType === "individual" && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Company Affiliation</label>
              <input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                className={inputClass}
                placeholder="e.g. Empresa X" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Description</label>
            <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
              className={inputClass}
              placeholder="Brief description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Tags (semicolon-separated)</label>
            <input type="text" value={newTags} onChange={(e) => setNewTags(e.target.value)}
              className={inputClass}
              placeholder="e.g. VC;Series A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Email</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={!newName.trim()}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors font-medium">Create</button>
          </div>
        </div>
      </Modal>

      {/* Investor detail modal (with edit + delete) */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail?.investor_name || "Investor Details"} wide>
        {showDetail && (
          <div className="space-y-5">
            {detailEditMode ? (
              /* ── Edit mode ── */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Type</label>
                  <div className="flex gap-2">
                    <button onClick={() => setEditType("fund")}
                      className={`flex-1 px-3 py-2 text-sm rounded-xl border font-medium transition-colors ${editType === "fund" ? "bg-brand-500 text-white border-brand-500" : "bg-surface-0 text-ink-600 border-brand-200 hover:bg-brand-50"}`}>
                      Fund
                    </button>
                    <button onClick={() => setEditType("individual")}
                      className={`flex-1 px-3 py-2 text-sm rounded-xl border font-medium transition-colors ${editType === "individual" ? "bg-purple-500 text-white border-purple-500" : "bg-surface-0 text-ink-600 border-brand-200 hover:bg-purple-50"}`}>
                      Individual Person
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Name *</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                </div>
                {editType === "individual" && (
                  <div>
                    <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Company Affiliation</label>
                    <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} className={inputClass} placeholder="e.g. Empresa X" />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Description</label>
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={inputClass} placeholder="Brief description" />
                </div>
                <div>
                  <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Tags (semicolon-separated)</label>
                  <input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Email</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Origin</label>
                    <select value={editOrigin} onChange={(e) => setEditOrigin(e.target.value as Investor["origin"])} className={inputClass}>
                      <option value="">Not set</option>
                      <option value="br">Brasileiro</option>
                      <option value="intl">Internacional</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Notes</label>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className={inputClass} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setDetailEditMode(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
                  <button onClick={handleSaveDetail} disabled={saving || !editName.trim()}
                    className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors font-medium">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <>
                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={() => setDetailEditMode(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-0 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {showDetail.email && (
                    <div>
                      <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm text-ink-700">{showDetail.email}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {(showDetail.investor_type === "individual") ? (
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg font-medium">Individual</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-600 rounded-lg font-medium">Fund</span>
                  )}
                  {showDetail.tags && showDetail.tags.split(";").filter(Boolean).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-brand-100 text-brand-600 rounded-lg font-medium">{tag.trim()}</span>
                  ))}
                  {showDetail.origin === "br" && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-lg font-medium">BR</span>
                  )}
                  {showDetail.origin === "intl" && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg font-medium">INTL</span>
                  )}
                </div>

                {showDetail.company_affiliation && (
                  <div>
                    <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Company Affiliation</p>
                    <p className="text-sm text-ink-700">{showDetail.company_affiliation}</p>
                  </div>
                )}

                {showDetail.description && (
                  <div>
                    <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-ink-700">{showDetail.description}</p>
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
              </>
            )}

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium mb-2">Delete this investor?</p>
                <p className="text-xs text-red-600 mb-3">
                  This will permanently delete <span className="font-semibold">{showDetail.investor_name}</span>. This cannot be undone.
                </p>
                {deleteError && (
                  <p className="text-xs text-red-700 bg-red-100 px-3 py-2 rounded-lg mb-3">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                    className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
                  <button onClick={handleDeleteInvestor} disabled={saving}
                    className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-medium">
                    {saving ? "Deleting..." : "Delete Permanently"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
