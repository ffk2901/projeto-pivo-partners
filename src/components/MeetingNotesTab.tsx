"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { MeetingNote, Investor, Sentiment, MeetingType } from "@/types";
import { SENTIMENT_CONFIG, MEETING_TYPE_LABELS } from "@/types";
import Modal from "./Modal";

interface Props {
  projectId?: string;
  investorId?: string;
  startupId?: string;
  investors?: Investor[];
  onRefresh?: () => void;
}

const MEETING_TYPE_ICONS: Record<MeetingType, string> = {
  call: "📞",
  in_person: "🤝",
  video: "📹",
  email: "📧",
  other: "📝",
};

export default function MeetingNotesTab({ projectId, investorId, startupId, investors = [], onRefresh }: Props) {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add note form
  const [formSubject, setFormSubject] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formSentiment, setFormSentiment] = useState<Sentiment>("neutral");
  const [formMeetingType, setFormMeetingType] = useState<MeetingType>("video");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formInvestorId, setFormInvestorId] = useState(investorId || "");
  const [formActionItems, setFormActionItems] = useState("");
  const [formTranscriptionUrl, setFormTranscriptionUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const filters: { investor_id?: string; project_id?: string; startup_id?: string } = {};
      if (investorId) filters.investor_id = investorId;
      if (projectId) filters.project_id = projectId;
      if (startupId) filters.startup_id = startupId;
      const data = await api().getMeetingNotes(filters);
      // Sort by date desc
      data.sort((a, b) => (b.meeting_date || b.created_at).localeCompare(a.meeting_date || a.created_at));
      setNotes(data);
    } catch (err) {
      console.error("Failed to load meeting notes:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, investorId, startupId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const getInvestorName = (id: string) =>
    investors.find((i) => i.investor_id === id)?.investor_name || id;

  const handleSaveNote = async () => {
    if (!formSubject.trim() || !formSummary.trim()) return;
    setSaving(true);
    try {
      await api().createMeetingNote({
        investor_id: formInvestorId,
        project_id: projectId || "",
        startup_id: startupId || "",
        meeting_date: formDate,
        meeting_type: formMeetingType,
        subject: formSubject,
        summary: formSummary,
        sentiment: formSentiment,
        action_items: formActionItems.split("\n").filter(Boolean).join(";;"),
        transcription_url: formTranscriptionUrl,
        source: "manual",
      });

      setShowAddModal(false);
      setFormSubject(""); setFormSummary(""); setFormSentiment("neutral");
      setFormMeetingType("video"); setFormActionItems(""); setFormTranscriptionUrl("");
      loadNotes();
      onRefresh?.();
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-16 bg-brand-200/40 rounded-xl"></div>
        <div className="h-16 bg-brand-200/40 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">
          {notes.length} meeting note{notes.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium"
        >
          + Add Meeting Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
          <p className="text-sm text-ink-400">No meeting notes yet</p>
          <p className="text-xs text-ink-300 mt-1">Add notes from calendar events or manually</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.note_id}
              className="bg-surface-0 border border-brand-200/60 rounded-xl overflow-hidden hover:border-brand-400 transition-colors"
            >
              <button
                onClick={() => setExpandedNote(expandedNote === note.note_id ? null : note.note_id)}
                className="w-full text-left px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SENTIMENT_CONFIG[note.sentiment]?.dot || "bg-amber-400"}`}></div>
                  <span className="text-sm text-ink-400 flex-shrink-0">{note.meeting_date}</span>
                  <span className="text-sm flex-shrink-0">{MEETING_TYPE_ICONS[note.meeting_type] || "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{note.subject}</p>
                    {note.investor_id && investors.length > 0 && (
                      <p className="text-xs text-ink-400 truncate">{getInvestorName(note.investor_id)}</p>
                    )}
                  </div>
                  <span className="text-xs text-ink-300 flex-shrink-0">{expandedNote === note.note_id ? "▾" : "▸"}</span>
                </div>
                {expandedNote !== note.note_id && note.summary && (
                  <p className="text-xs text-ink-400 mt-1 ml-5 line-clamp-2">{note.summary}</p>
                )}
              </button>

              {expandedNote === note.note_id && (
                <div className="border-t border-brand-200/60 px-4 py-3 space-y-3 bg-brand-50/30">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${SENTIMENT_CONFIG[note.sentiment]?.bg} ${SENTIMENT_CONFIG[note.sentiment]?.color}`}>
                      {SENTIMENT_CONFIG[note.sentiment]?.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                      {MEETING_TYPE_LABELS[note.meeting_type]}
                    </span>
                    {note.source === "calendar" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">From Calendar</span>
                    )}
                  </div>

                  {note.attendees && (
                    <div>
                      <p className="text-[10px] text-ink-400 uppercase tracking-wide mb-0.5">Attendees</p>
                      <p className="text-xs text-ink-600">{note.attendees}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] text-ink-400 uppercase tracking-wide mb-0.5">Summary</p>
                    <p className="text-sm text-ink-700 whitespace-pre-wrap">{note.summary}</p>
                  </div>

                  {note.action_items && (
                    <div>
                      <p className="text-[10px] text-ink-400 uppercase tracking-wide mb-0.5">Action Items</p>
                      <ul className="space-y-0.5">
                        {note.action_items.split(";;").filter(Boolean).map((item, i) => (
                          <li key={i} className="text-xs text-ink-600 flex gap-1.5">
                            <span className="text-ink-400">•</span>
                            {item.trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {note.transcription_url && (
                    <div>
                      <a
                        href={note.transcription_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        View Transcription →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Meeting Note">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Subject *</label>
            <input
              type="text"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="e.g. Follow-up call with investor"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Type</label>
              <select
                value={formMeetingType}
                onChange={(e) => setFormMeetingType(e.target.value as MeetingType)}
                className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="video">Video</option>
                <option value="call">Call</option>
                <option value="in_person">In Person</option>
                <option value="email">Email</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {investors.length > 0 && !investorId && (
            <div>
              <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Investor</label>
              <select
                value={formInvestorId}
                onChange={(e) => setFormInvestorId(e.target.value)}
                className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="">-- Select --</option>
                {investors.map((inv) => (
                  <option key={inv.investor_id} value={inv.investor_id}>{inv.investor_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Summary *</label>
            <textarea
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              rows={4}
              className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
              placeholder="What happened? Key takeaways..."
            />
          </div>

          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Sentiment</label>
            <div className="flex gap-1.5">
              {(["very_positive", "positive", "neutral", "negative"] as Sentiment[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormSentiment(s)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    formSentiment === s
                      ? `${SENTIMENT_CONFIG[s].bg} ${SENTIMENT_CONFIG[s].color}`
                      : "bg-surface-0 text-ink-400 border border-brand-200/60 hover:bg-brand-50"
                  }`}
                >
                  {SENTIMENT_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Action Items (one per line)</label>
            <textarea
              value={formActionItems}
              onChange={(e) => setFormActionItems(e.target.value)}
              rows={2}
              className="w-full border border-brand-200 rounded-xl px-3 py-2 text-xs bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
              placeholder="e.g. Send term sheet&#10;Schedule due diligence call"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Transcription URL (optional)</label>
            <input
              type="url"
              value={formTranscriptionUrl}
              onChange={(e) => setFormTranscriptionUrl(e.target.value)}
              className="w-full border border-brand-200 rounded-xl px-3 py-2 text-xs bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="https://granola.ai/..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
            <button
              onClick={handleSaveNote}
              disabled={saving || !formSubject.trim() || !formSummary.trim()}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
