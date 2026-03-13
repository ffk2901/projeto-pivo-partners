"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import type { ProjectNote, TeamMember, Investor, ProjectInvestor, Meeting, NoteType } from "@/types";
import { NOTE_TYPE_LABELS } from "@/types";
import Modal from "./Modal";

interface Props {
  projectId: string;
  notes: ProjectNote[];
  team: TeamMember[];
  investors: Investor[];
  piLinks: ProjectInvestor[];
  meetings: Meeting[];
  onRefresh: () => void;
  readOnly?: boolean;
  apiPrefix?: string;
}

export default function NotesTable({ projectId, notes, team, investors, piLinks, meetings, onRefresh, readOnly, apiPrefix }: Props) {
  // Filters
  const [filterInvestor, setFilterInvestor] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterHasNextStep, setFilterHasNextStep] = useState("");
  const [filterHasMeeting, setFilterHasMeeting] = useState("");
  const [filterFollowUpStatus, setFilterFollowUpStatus] = useState("");
  const [searchText, setSearchText] = useState("");

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "list">("table");

  // Form
  const [showCreate, setShowCreate] = useState(false);
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formType, setFormType] = useState<NoteType>("general_update");
  const [formInvestor, setFormInvestor] = useState("");
  const [formNextStep, setFormNextStep] = useState("");
  const [formFollowUpDate, setFormFollowUpDate] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formMeetingId, setFormMeetingId] = useState("");

  // Get investor names for the project
  const projectInvestorIds = useMemo(() => new Set(piLinks.map((pi) => pi.investor_id)), [piLinks]);
  const projectInvestors = useMemo(() =>
    investors.filter((i) => projectInvestorIds.has(i.investor_id)),
    [investors, projectInvestorIds]
  );

  const getInvestorName = (id: string) => investors.find((i) => i.investor_id === id)?.investor_name || "";
  const getAuthorName = (id: string) => team.find((m) => m.team_id === id)?.name || "";

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return iso; }
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  // Apply filters
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (filterInvestor) result = result.filter((n) => n.investor_id === filterInvestor);
    if (filterAuthor) result = result.filter((n) => n.author_id === filterAuthor);
    if (filterType) result = result.filter((n) => n.note_type === filterType);
    if (filterDateFrom) result = result.filter((n) => n.created_at >= filterDateFrom);
    if (filterDateTo) result = result.filter((n) => n.created_at <= filterDateTo + "T23:59:59");
    if (filterHasNextStep === "yes") result = result.filter((n) => n.next_step);
    if (filterHasNextStep === "no") result = result.filter((n) => !n.next_step);
    if (filterHasMeeting === "yes") result = result.filter((n) => n.meeting_id);
    if (filterHasMeeting === "no") result = result.filter((n) => !n.meeting_id);
    if (filterFollowUpStatus === "has") result = result.filter((n) => n.follow_up_date);
    if (filterFollowUpStatus === "none") result = result.filter((n) => !n.follow_up_date);
    if (filterFollowUpStatus === "overdue") {
      const today = new Date().toISOString().split("T")[0];
      result = result.filter((n) => n.follow_up_date && n.follow_up_date < today);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter((n) =>
        n.title.toLowerCase().includes(lower) ||
        n.content.toLowerCase().includes(lower) ||
        n.next_step.toLowerCase().includes(lower) ||
        getInvestorName(n.investor_id).toLowerCase().includes(lower)
      );
    }

    return result;
  }, [notes, filterInvestor, filterAuthor, filterType, filterDateFrom, filterDateTo, filterHasNextStep, filterHasMeeting, filterFollowUpStatus, searchText]);

  const activeFilterCount = [filterInvestor, filterAuthor, filterType, filterDateFrom, filterDateTo, filterHasNextStep, filterHasMeeting, filterFollowUpStatus, searchText].filter(Boolean).length;

  const clearFilters = () => {
    setFilterInvestor(""); setFilterAuthor(""); setFilterType("");
    setFilterDateFrom(""); setFilterDateTo(""); setFilterHasNextStep("");
    setFilterHasMeeting(""); setFilterFollowUpStatus(""); setSearchText("");
  };

  const openCreate = () => {
    setFormTitle(""); setFormContent(""); setFormAuthor(team[0]?.team_id || "");
    setFormType("general_update"); setFormInvestor(""); setFormNextStep("");
    setFormFollowUpDate(""); setFormTags(""); setFormMeetingId("");
    setError(null); setShowCreate(true);
  };

  const openEdit = (note: ProjectNote) => {
    setFormTitle(note.title); setFormContent(note.content); setFormAuthor(note.author_id);
    setFormType(note.note_type || "general_update"); setFormInvestor(note.investor_id);
    setFormNextStep(note.next_step); setFormFollowUpDate(note.follow_up_date);
    setFormTags(note.tags); setFormMeetingId(note.meeting_id);
    setError(null); setEditingNote(note);
  };

  const handleSave = async () => {
    if (!formContent.trim()) { setError("Content is required"); return; }
    setSaving(true); setError(null);
    try {
      if (editingNote) {
        await api(apiPrefix).updateProjectNote({
          note_id: editingNote.note_id,
          title: formTitle, content: formContent, author_id: formAuthor,
          investor_id: formInvestor, note_type: formType, next_step: formNextStep,
          follow_up_date: formFollowUpDate, tags: formTags, meeting_id: formMeetingId,
        });
        setEditingNote(null);
      } else {
        await api(apiPrefix).createProjectNote({
          project_id: projectId,
          title: formTitle, content: formContent, author_id: formAuthor,
          investor_id: formInvestor, note_type: formType, next_step: formNextStep,
          follow_up_date: formFollowUpDate, tags: formTags, meeting_id: formMeetingId,
        });
        setShowCreate(false);
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setSaving(true);
    try {
      await api(apiPrefix).deleteProjectNote(noteId);
      setDeleteConfirm(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "border border-brand-200 rounded-lg px-2 py-1.5 text-xs bg-surface-50 focus:outline-none focus:ring-1 focus:ring-brand-500/40";
  const inputClass = "w-full border border-brand-200 rounded-xl px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

  const noteForm = (
    <div className="space-y-3">
      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Type</label>
          <select value={formType} onChange={(e) => setFormType(e.target.value as NoteType)} className={inputClass}>
            {Object.entries(NOTE_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Investor (optional)</label>
          <select value={formInvestor} onChange={(e) => setFormInvestor(e.target.value)} className={inputClass}>
            <option value="">Project-level note</option>
            {projectInvestors.map((inv) => (
              <option key={inv.investor_id} value={inv.investor_id}>{inv.investor_name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Title (optional)</label>
        <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Note title" className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Content *</label>
        <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={5} placeholder="Write your notes..." className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Author</label>
          <select value={formAuthor} onChange={(e) => setFormAuthor(e.target.value)} className={inputClass}>
            <option value="">Select</option>
            {team.map((m) => <option key={m.team_id} value={m.team_id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Linked Meeting</label>
          <select value={formMeetingId} onChange={(e) => setFormMeetingId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {meetings.map((m) => <option key={m.meeting_id} value={m.meeting_id}>{m.title} ({m.date})</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Next Step</label>
        <input type="text" value={formNextStep} onChange={(e) => setFormNextStep(e.target.value)} placeholder="Next step..." className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Follow-up Date</label>
          <input type="date" value={formFollowUpDate} onChange={(e) => setFormFollowUpDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Tags</label>
          <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="tag1;tag2" className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => { setShowCreate(false); setEditingNote(null); }} disabled={saving} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-medium disabled:opacity-50">
          {saving ? "Saving..." : editingNote ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-500">{filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}</p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-[10px] text-brand-500 hover:text-brand-700 font-medium">
              Clear filters ({activeFilterCount})
            </button>
          )}
          {/* View toggle */}
          <div className="flex border border-brand-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("table")} className={`px-2 py-1 text-[10px] font-medium ${viewMode === "table" ? "bg-brand-500 text-white" : "text-ink-500 hover:bg-brand-50"}`}>Table</button>
            <button onClick={() => setViewMode("list")} className={`px-2 py-1 text-[10px] font-medium ${viewMode === "list" ? "bg-brand-500 text-white" : "text-ink-500 hover:bg-brand-50"}`}>List</button>
          </div>
        </div>
        {!readOnly && (
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm">
            + New Note
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search notes..." className={`${selectClass} w-48`} />
        <select value={filterInvestor} onChange={(e) => setFilterInvestor(e.target.value)} className={selectClass}>
          <option value="">All Investors</option>
          {projectInvestors.map((inv) => (
            <option key={inv.investor_id} value={inv.investor_id}>{inv.investor_name}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClass}>
          <option value="">All Types</option>
          {Object.entries(NOTE_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select value={filterAuthor} onChange={(e) => setFilterAuthor(e.target.value)} className={selectClass}>
          <option value="">All Authors</option>
          {team.map((m) => <option key={m.team_id} value={m.team_id}>{m.name}</option>)}
        </select>
        <select value={filterHasNextStep} onChange={(e) => setFilterHasNextStep(e.target.value)} className={selectClass}>
          <option value="">Next Step</option>
          <option value="yes">Has Next Step</option>
          <option value="no">No Next Step</option>
        </select>
        <select value={filterFollowUpStatus} onChange={(e) => setFilterFollowUpStatus(e.target.value)} className={selectClass}>
          <option value="">Follow-up</option>
          <option value="has">Has Follow-up</option>
          <option value="none">No Follow-up</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={filterHasMeeting} onChange={(e) => setFilterHasMeeting(e.target.value)} className={selectClass}>
          <option value="">Meeting Link</option>
          <option value="yes">Linked</option>
          <option value="no">Not Linked</option>
        </select>
        <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={selectClass} title="From date" />
        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={selectClass} title="To date" />
      </div>

      {/* Table View */}
      {viewMode === "table" ? (
        filteredNotes.length > 0 ? (
          <div className="overflow-x-auto border border-brand-200/60 rounded-2xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-50 border-b border-brand-200/40">
                  <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Date</th>
                  <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Investor</th>
                  <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Type</th>
                  <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Title</th>
                  <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Author</th>
                  <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Next Step</th>
                  <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Follow-up</th>
                  {!readOnly && <th className="text-right px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note) => {
                  const today = new Date().toISOString().split("T")[0];
                  const isOverdue = note.follow_up_date && note.follow_up_date < today;
                  return (
                    <tr key={note.note_id} className="border-b border-brand-100/40 hover:bg-brand-50/30 transition-colors">
                      <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap">{formatDateTime(note.created_at)}</td>
                      <td className="px-3 py-2.5">
                        {note.investor_id ? (
                          <span className="text-ink-700 font-medium">{getInvestorName(note.investor_id)}</span>
                        ) : (
                          <span className="text-ink-300 italic">Project</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium text-[10px]">
                          {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-ink-700 max-w-[200px] truncate">{note.title || <span className="text-ink-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-ink-500">{getAuthorName(note.author_id) || <span className="text-ink-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-ink-600 max-w-[160px] truncate">{note.next_step || <span className="text-ink-300">—</span>}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {note.follow_up_date ? (
                          <span className={isOverdue ? "text-red-600 font-medium" : "text-ink-500"}>{formatDate(note.follow_up_date)}</span>
                        ) : <span className="text-ink-300">—</span>}
                      </td>
                      {!readOnly && (
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => openEdit(note)} className="text-ink-400 hover:text-brand-600 px-1.5 py-0.5 rounded hover:bg-brand-50">Edit</button>
                          <button onClick={() => setDeleteConfirm(note.note_id)} className="text-ink-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 ml-1">Delete</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState onCreateClick={openCreate} />
        )
      ) : (
        /* List View */
        filteredNotes.length > 0 ? (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div key={note.note_id} className="bg-surface-0 border border-brand-200/60 rounded-2xl p-4 hover:border-brand-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {note.note_type && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium">
                          {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                        </span>
                      )}
                      {note.investor_id && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-surface-100 text-ink-600 rounded-md font-medium">
                          {getInvestorName(note.investor_id)}
                        </span>
                      )}
                    </div>
                    {note.title && <h3 className="text-sm font-semibold text-ink-800 mb-0.5">{note.title}</h3>}
                    <div className="flex items-center gap-2 text-[10px] text-ink-400">
                      {note.author_id && <span>{getAuthorName(note.author_id)}</span>}
                      <span>{formatDateTime(note.created_at)}</span>
                      {note.updated_at !== note.created_at && <span className="italic">edited</span>}
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => openEdit(note)} className="text-xs text-ink-400 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50">Edit</button>
                      <button onClick={() => setDeleteConfirm(note.note_id)} className="text-xs text-ink-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">Delete</button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-ink-600 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                {note.next_step && <p className="text-xs text-brand-500 mt-2">Next: {note.next_step}</p>}
                {note.follow_up_date && <p className="text-[10px] text-ink-400 mt-1">Follow-up: {formatDate(note.follow_up_date)}</p>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState onCreateClick={openCreate} />
        )
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Note" wide>
        {noteForm}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingNote} onClose={() => setEditingNote(null)} title="Edit Note" wide>
        {noteForm}
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Note">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">Are you sure you want to delete this note?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteConfirm(null)} disabled={saving} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Cancel</button>
            <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium disabled:opacity-50">
              {saving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="text-center py-12 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
      <p className="text-ink-400 text-sm mb-2">No notes found</p>
      <button onClick={onCreateClick} className="text-sm text-brand-500 hover:text-brand-700 font-medium">
        Create first note
      </button>
    </div>
  );
}
