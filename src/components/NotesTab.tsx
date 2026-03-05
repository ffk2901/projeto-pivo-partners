"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { ProjectNote, TeamMember } from "@/types";
import Modal from "./Modal";

interface Props {
  projectId: string;
  notes: ProjectNote[];
  team: TeamMember[];
  onRefresh: () => void;
}

export default function NotesTab({ projectId, notes, team, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formAuthor, setFormAuthor] = useState("");

  const getAuthorName = (authorId: string) => {
    const member = team.find((m) => m.team_id === authorId);
    return member?.name || authorId || "Unknown";
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  const openCreate = () => {
    setFormTitle("");
    setFormContent("");
    setFormAuthor(team[0]?.team_id || "");
    setError(null);
    setShowCreate(true);
  };

  const openEdit = (note: ProjectNote) => {
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormAuthor(note.author_id);
    setError(null);
    setEditingNote(note);
  };

  const handleSave = async () => {
    if (!formContent.trim()) {
      setError("Content is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingNote) {
        await api().updateProjectNote({
          note_id: editingNote.note_id,
          title: formTitle,
          content: formContent,
          author_id: formAuthor,
        });
        setEditingNote(null);
      } else {
        await api().createProjectNote({
          project_id: projectId,
          title: formTitle,
          content: formContent,
          author_id: formAuthor,
        });
        setShowCreate(false);
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setSaving(true);
    try {
      await api().deleteProjectNote(noteId);
      setDeleteConfirm(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setSaving(false);
    }
  };

  const noteForm = (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Title (optional)</label>
        <input
          type="text"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          placeholder="e.g. Meeting with fund manager"
          className="w-full border border-brand-200 rounded-xl px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Content *</label>
        <textarea
          value={formContent}
          onChange={(e) => setFormContent(e.target.value)}
          rows={6}
          placeholder="Write your notes here..."
          className="w-full border border-brand-200 rounded-xl px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Author</label>
        <select
          value={formAuthor}
          onChange={(e) => setFormAuthor(e.target.value)}
          className="w-full border border-brand-200 rounded-xl px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="">Select author</option>
          {team.map((m) => (
            <option key={m.team_id} value={m.team_id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => { setShowCreate(false); setEditingNote(null); }}
          disabled={saving}
          className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : editingNote ? "Update Note" : "Create Note"}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
        >
          + New Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
          <p className="text-ink-400 text-sm mb-2">No notes yet</p>
          <button
            onClick={openCreate}
            className="text-sm text-brand-500 hover:text-brand-700 font-medium transition-colors"
          >
            Create first note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.note_id} className="bg-surface-0 border border-brand-200/60 rounded-2xl p-4 hover:border-brand-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  {note.title && (
                    <h3 className="text-sm font-semibold text-ink-800 mb-0.5">{note.title}</h3>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-ink-400">
                    {note.author_id && (
                      <span className="px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium">
                        {getAuthorName(note.author_id)}
                      </span>
                    )}
                    <span>{formatDate(note.created_at)}</span>
                    {note.updated_at !== note.created_at && (
                      <span className="italic">edited {formatDate(note.updated_at)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => openEdit(note)}
                    className="text-xs text-ink-400 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(note.note_id)}
                    className="text-xs text-ink-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-ink-600 whitespace-pre-wrap leading-relaxed">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Note Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Note">
        {noteForm}
      </Modal>

      {/* Edit Note Modal */}
      <Modal open={!!editingNote} onClose={() => setEditingNote(null)} title="Edit Note">
        {noteForm}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Note">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">Are you sure you want to delete this note? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              disabled={saving}
              className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={saving}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
