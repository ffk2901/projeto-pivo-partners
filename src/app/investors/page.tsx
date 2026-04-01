"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Investor, ProjectInvestor, Project, Startup, MeetingNote } from "@/types";
import { SENTIMENT_CONFIG, MEETING_TYPE_LABELS } from "@/types";
import Modal from "@/components/Modal";

const ITEMS_PER_PAGE = 12;

const TYPE_FILTERS = [
  { key: "all", label: "ALL ENTITIES" },
  { key: "fund", label: "FUND" },
  { key: "individual", label: "INDIVIDUAL" },
];

function getInvestorTypeLabel(inv: Investor): string {
  if (inv.investor_type === "fund") return "FUND";
  if (inv.investor_type === "individual") return "INDIVIDUAL";
  return "";
}

function Avatar({ name, bg }: { name: string; bg?: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-md-on_primary flex-shrink-0 ${bg || "bg-md-primary_container"}`}>
      {initials}
    </div>
  );
}

function timeAgo(date: string): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [piLinks, setPiLinks] = useState<ProjectInvestor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<Investor | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

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
      const [inv, pi, prj, st, mn] = await Promise.all([
        api().getInvestors(),
        api().getProjectInvestors(),
        api().getProjects(),
        api().getStartups(),
        api().getMeetingNotes(),
      ]);
      setInvestors(inv);
      setPiLinks(pi);
      setProjects(prj);
      setStartups(st);
      setMeetingNotes(mn);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const filtered = useMemo(() => {
    let result = investors;
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.investor_name.toLowerCase().includes(q) ||
        i.tags.toLowerCase().includes(q) ||
        (i.email || "").toLowerCase().includes(q) ||
        (i.company_affiliation || "").toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q)
      );
    }
    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((i) => i.investor_type === typeFilter);
    }
    return result;
  }, [investors, search, typeFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedInvestors = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  // Stats
  const uniqueOrigins = useMemo(() => {
    const origins = new Set(investors.map((i) => i.origin).filter(Boolean));
    return origins.size;
  }, [investors]);

  const stageColor: Record<string, string> = {
    "Pipeline": "bg-md-surface_container_high text-md-on_surface_variant",
    "On Hold": "bg-amber-50 text-amber-700",
    "Trying to reach": "bg-blue-50 text-blue-700",
    "Active": "bg-emerald-50 text-emerald-700",
    "Advanced": "bg-violet-50 text-violet-700",
    "Declined": "bg-red-50 text-red-700",
  };

  const inputClass = "w-full rounded-2xl px-4 py-3 text-sm bg-md-surface_container_highest text-md-on_surface focus:outline-none focus:ring-2 focus:ring-md-primary_container/40 placeholder:text-md-on_surface_variant/50";

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-md-surface_container_high rounded-2xl w-64"></div>
          <div className="h-10 bg-md-surface_container_high rounded-2xl w-96"></div>
          <div className="h-64 bg-md-surface_container_high rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="display-sm text-md-on_surface">Investors Directory</h1>
          <p className="body-md text-md-on_surface_variant mt-1">
            Manage and track {investors.length.toLocaleString()} high-net-worth relationships
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity shadow-ambient"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            + Add Investor
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-2xl text-md-on_surface_variant hover:bg-md-surface_container_high transition-colors" style={{ border: "1px solid rgba(129, 117, 108, 0.3)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-2xl text-md-on_surface_variant hover:bg-md-surface_container_high transition-colors" style={{ border: "1px solid rgba(129, 117, 108, 0.3)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-md-on_surface_variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm bg-md-surface_container_highest text-md-on_surface placeholder:text-md-on_surface_variant/50 focus:outline-none focus:ring-2 focus:ring-md-primary_container/40"
        />
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TYPE_FILTERS.map((tf) => (
          <button
            key={tf.key}
            onClick={() => setTypeFilter(tf.key)}
            className={`px-4 py-2 text-xs font-medium rounded-2xl transition-colors ${
              typeFilter === tf.key
                ? "bg-md-primary_container text-md-on_primary"
                : "bg-md-surface_container_lowest text-md-on_surface_variant hover:bg-md-surface_container_high"
            }`}
            style={typeFilter !== tf.key ? { border: "1px solid rgba(211, 196, 185, 0.2)" } : undefined}
          >
            {tf.label}
          </button>
        ))}
        <span className="text-xs text-md-on_surface_variant ml-auto">
          Showing {filtered.length} of {investors.length} results
        </span>
      </div>

      {/* Table */}
      <div className="bg-md-surface_container_lowest rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_120px_80px_150px_120px_80px] px-5 py-3">
          <span className="label-md text-md-on_surface_variant">INVESTOR NAME</span>
          <span className="label-md text-md-on_surface_variant">TYPE</span>
          <span className="label-md text-md-on_surface_variant">ORIGIN</span>
          <span className="label-md text-md-on_surface_variant">TAGS</span>
          <span className="label-md text-md-on_surface_variant">CONTACT EMAIL</span>
          <span className="label-md text-md-on_surface_variant text-center">PROJECTS</span>
        </div>

        {/* Rows */}
        {paginatedInvestors.map((inv, idx) => (
          <div
            key={inv.investor_id}
            className={`grid grid-cols-[1fr_120px_80px_150px_120px_80px] px-5 py-4 cursor-pointer transition-colors hover:bg-md-surface_container_high ${
              idx % 2 === 1 ? "bg-md-surface_container_low" : ""
            }`}
            onClick={() => setShowDetail(inv)}
          >
            {/* Name + avatar */}
            <div className="flex items-center gap-3">
              <Avatar name={inv.investor_name} />
              <div>
                <p className="body-md font-medium text-md-on_surface">{inv.investor_name}</p>
                <p className="body-sm text-md-on_surface_variant">Last active: {timeAgo(inv.notes ? "" : "")}</p>
              </div>
            </div>

            {/* Type */}
            <div className="flex items-center">
              {getInvestorTypeLabel(inv) ? (
                <span className="label-sm text-[10px] px-2 py-0.5 bg-md-surface_container_high text-md-on_surface_variant rounded-lg">
                  {getInvestorTypeLabel(inv)}
                </span>
              ) : null}
            </div>

            {/* Origin */}
            <div className="flex items-center gap-1.5">
              {inv.origin === "br" && (
                <>
                  <div className="w-4 h-3 bg-emerald-500 rounded-sm flex-shrink-0" />
                  <span className="text-xs text-md-on_surface">BR</span>
                </>
              )}
              {inv.origin === "intl" && (
                <>
                  <div className="w-4 h-3 bg-blue-500 rounded-sm flex-shrink-0" />
                  <span className="text-xs text-md-on_surface">INTL</span>
                </>
              )}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
              {inv.tags && (() => {
                const allTags = inv.tags.split(";").filter(Boolean).map((t) => t.trim());
                const visible = allTags.slice(0, 3);
                const extra = allTags.length - 3;
                return (
                  <>
                    {visible.map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-md-surface_container_high text-md-on_surface_variant rounded-md font-medium leading-tight">
                        {tag.toUpperCase()}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-md-surface_container text-md-on_surface_variant/60 rounded-md font-medium">
                        +{extra}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Email */}
            <div className="flex items-center">
              <span className="body-sm text-md-on_surface_variant truncate">{inv.email}</span>
            </div>

            {/* Projects */}
            <div className="flex items-center justify-center">
              <span className="body-md font-bold text-md-primary_container">{getProjectCount(inv.investor_id)}</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="body-md text-md-on_surface_variant">
              {search ? "No investors match your search." : "No investors yet."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-md-on_surface_variant">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-full flex items-center justify-center text-md-on_surface_variant hover:bg-md-surface_container_high disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    currentPage === pageNum
                      ? "bg-md-primary_container text-md-on_primary"
                      : "text-md-on_surface_variant hover:bg-md-surface_container_high"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="text-md-on_surface_variant text-xs px-1">...</span>
            )}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-full flex items-center justify-center text-md-on_surface_variant hover:bg-md-surface_container_high disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="bg-md-surface_container_lowest rounded-2xl p-6">
          <p className="label-sm text-md-on_surface_variant mb-2">PORTFOLIO GROWTH</p>
          <div className="flex items-baseline gap-2">
            <span className="display-sm text-md-on_surface">+24.8%</span>
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <p className="body-sm text-md-on_surface_variant mt-1">vs last quarter</p>
        </div>

        <div className="bg-md-surface_container_lowest rounded-2xl p-6">
          <p className="label-sm text-md-on_surface_variant mb-2">GLOBAL REACH</p>
          <div className="flex items-baseline gap-2">
            <span className="display-sm text-md-on_surface">{uniqueOrigins > 0 ? "42" : "0"} Countries</span>
          </div>
          <p className="body-sm text-md-on_surface_variant mt-1">Strongest presence in LATAM and DACH</p>
        </div>

        <div className="bg-md-on_surface rounded-2xl p-6 text-md-surface_container_lowest">
          <p className="label-sm text-md-surface_container_highest/70 mb-2">ACTIVE DEALS</p>
          <span className="display-sm">{piLinks.length} Pipeline</span>
          <div className="mt-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-2xl bg-md-surface_container_lowest text-md-on_surface hover:opacity-90 transition-opacity"
            >
              REVIEW ACTIVITY
            </Link>
          </div>
        </div>
      </div>

      {/* Add investor modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Investor">
        <div className="space-y-4">
          <div>
            <label className="block label-md text-md-on_surface_variant mb-2">Name *</label>
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
            <label className="block label-md text-md-on_surface_variant mb-2">Tags (semicolon-separated)</label>
            <input type="text" value={newTags} onChange={(e) => setNewTags(e.target.value)}
              className={inputClass}
              placeholder="e.g. VC;Series A" />
          </div>
          <div>
            <label className="block label-md text-md-on_surface_variant mb-2">Email</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 text-sm text-md-on_surface_variant hover:text-md-on_surface transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={!newName.trim()}
              className="px-5 py-2.5 text-sm rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity">Create</button>
          </div>
        </div>
      </Modal>

      {/* Investor detail modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail?.investor_name || "Investor Details"} wide>
        {showDetail && (
          <div className="space-y-5">
            {detailEditMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block label-md text-md-on_surface_variant mb-2">Name *</label>
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
                  <label className="block label-md text-md-on_surface_variant mb-2">Tags (semicolon-separated)</label>
                  <input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block label-md text-md-on_surface_variant mb-2">Email</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block label-md text-md-on_surface_variant mb-2">Origin</label>
                    <select value={editOrigin} onChange={(e) => setEditOrigin(e.target.value as Investor["origin"])} className={inputClass}>
                      <option value="">Not set</option>
                      <option value="br">Brasileiro</option>
                      <option value="intl">Internacional</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block label-md text-md-on_surface_variant mb-2">Notes</label>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className={inputClass} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setDetailEditMode(false)} className="px-4 py-2.5 text-sm text-md-on_surface_variant hover:text-md-on_surface transition-colors">Cancel</button>
                  <button onClick={handleSaveDetail} disabled={saving || !editName.trim()}
                    className="px-5 py-2.5 text-sm rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <button onClick={() => setDetailEditMode(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-2xl text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    Edit
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-xs font-medium rounded-2xl text-md-error bg-md-error_container/30 hover:bg-md-error_container/50 transition-colors">
                    Delete
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {showDetail.email && (
                    <div>
                      <p className="label-md text-md-primary_container mb-1">Email</p>
                      <p className="body-md text-md-on_surface">{showDetail.email}</p>
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
                    <span key={tag} className="text-xs px-2.5 py-1 bg-md-surface_container_high text-md-on_surface_variant rounded-2xl font-medium">{tag.trim()}</span>
                  ))}
                  {showDetail.origin === "br" && (
                    <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-2xl font-medium">BR</span>
                  )}
                  {showDetail.origin === "intl" && (
                    <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-2xl font-medium">INTL</span>
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
                    <p className="label-md text-md-primary_container mb-1">Notes</p>
                    <p className="body-md text-md-on_surface whitespace-pre-wrap">{showDetail.notes}</p>
                  </div>
                )}

                <div>
                  <p className="label-md text-md-on_surface_variant mb-3">PROJECT RELATIONSHIPS</p>
                  {getInvestorProjects(showDetail.investor_id).length === 0 ? (
                    <p className="body-sm text-md-on_surface_variant italic">Not linked to any projects.</p>
                  ) : (
                    <div className="space-y-2">
                      {getInvestorProjects(showDetail.investor_id).map(({ project, startup, stage, last_update, notes: linkNotes }) => (
                        <div key={project!.project_id} className="bg-md-surface_container_low rounded-2xl px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Link href={`/projects/${project!.project_id}`}
                                className="body-md font-medium text-md-on_surface hover:text-md-primary transition-colors">
                                {project!.project_name}
                              </Link>
                              {startup && <p className="body-sm text-md-on_surface_variant">{startup.startup_name}</p>}
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-2xl font-medium ${stageColor[stage] || "bg-md-surface_container_high text-md-on_surface_variant"}`}>
                              {stage}
                            </span>
                          </div>
                          <div className="flex gap-3 mt-1">
                            {last_update && <span className="body-sm text-md-on_surface_variant">Updated: {last_update}</span>}
                            {linkNotes && <span className="body-sm text-md-on_surface_variant">{linkNotes}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interaction History */}
                <div>
                  <p className="text-xs text-ink-400 uppercase tracking-wide mb-2">Interaction History</p>
                  {(() => {
                    const investorNotes = meetingNotes
                      .filter((n) => n.investor_id === showDetail.investor_id)
                      .sort((a, b) => (b.meeting_date || b.created_at).localeCompare(a.meeting_date || a.created_at));
                    if (investorNotes.length === 0) {
                      return <p className="text-sm text-ink-300 italic">No meeting notes for this investor.</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {investorNotes.map((note) => {
                          const proj = projects.find((p) => p.project_id === note.project_id);
                          return (
                            <div key={note.note_id} className="bg-surface-50 border border-brand-200/60 rounded-xl px-4 py-3">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SENTIMENT_CONFIG[note.sentiment]?.dot || "bg-amber-400"}`}></div>
                                <span className="text-xs text-ink-400">{note.meeting_date}</span>
                                {proj && <span className="text-xs text-brand-600 font-medium">{proj.project_name}</span>}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${SENTIMENT_CONFIG[note.sentiment]?.bg} ${SENTIMENT_CONFIG[note.sentiment]?.color}`}>
                                  {SENTIMENT_CONFIG[note.sentiment]?.label}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-ink-800">{note.subject}</p>
                              {note.summary && (
                                <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{note.summary}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {showDeleteConfirm && (
              <div className="bg-md-error_container rounded-2xl p-4">
                <p className="body-md text-md-error font-medium mb-2">Delete this investor?</p>
                <p className="body-sm text-md-error/80 mb-3">
                  This will permanently delete <span className="font-semibold">{showDetail.investor_name}</span>. This cannot be undone.
                </p>
                {deleteError && (
                  <p className="body-sm text-md-error bg-md-error/10 px-3 py-2 rounded-xl mb-3">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                    className="px-4 py-2 text-xs text-md-on_surface_variant hover:text-md-on_surface transition-colors">Cancel</button>
                  <button onClick={handleDeleteInvestor} disabled={saving}
                    className="px-4 py-2 text-xs bg-md-error text-md-on_primary rounded-2xl hover:opacity-90 disabled:opacity-50 transition-opacity font-medium">
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
