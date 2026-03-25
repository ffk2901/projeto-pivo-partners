"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { CalendarEvent, MeetingNote, Sentiment, MeetingType } from "@/types";
import { SENTIMENT_CONFIG } from "@/types";

interface Props {
  teamId: string;
  onNoteCreated?: () => void;
}

function getWeekDays(): { date: string; label: string; dayName: string; isToday: boolean }[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));

  const days: { date: string; label: string; dayName: string; isToday: boolean }[] = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const todayStr = now.toISOString().split("T")[0];

  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      label: d.getDate().toString(),
      dayName: dayNames[i],
      isToday: dateStr === todayStr,
    });
  }
  return days;
}

function formatTime(isoStr: string): string {
  if (!isoStr || !isoStr.includes("T")) return "";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function CalendarWidget({ teamId, onNoteCreated }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Quick note form state
  const [noteSummary, setNoteSummary] = useState("");
  const [noteSentiment, setNoteSentiment] = useState<Sentiment>("neutral");
  const [noteMeetingType, setNoteMeetingType] = useState<MeetingType>("video");
  const [noteActionItems, setNoteActionItems] = useState("");
  const [noteTranscriptionUrl, setNoteTranscriptionUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekDays = getWeekDays();

  const checkConnection = useCallback(async () => {
    try {
      const status = await api().getCalendarConnectionStatus(teamId);
      setConnected(status.connected);
      if (status.email) setEmail(status.email);
    } catch {
      setConnected(false);
    }
  }, [teamId]);

  const loadWeekEvents = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const events = await api().getCalendarEvents(teamId, undefined, "week");
      setWeekEvents(events);
    } catch (err) {
      console.error("Failed to load calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [teamId, connected]);

  useEffect(() => { checkConnection(); }, [checkConnection]);
  useEffect(() => { if (connected) loadWeekEvents(); }, [connected, loadWeekEvents]);

  const dayEvents = weekEvents.filter((e) => {
    const eventDate = e.start.includes("T") ? e.start.split("T")[0] : e.start;
    return eventDate === selectedDate;
  });

  // Count events per day for dots
  const eventCountByDay = new Map<string, number>();
  for (const e of weekEvents) {
    const d = e.start.includes("T") ? e.start.split("T")[0] : e.start;
    eventCountByDay.set(d, (eventCountByDay.get(d) || 0) + 1);
  }

  const handleExpandNote = async (event: CalendarEvent) => {
    if (expandedEvent === event.event_id) {
      setExpandedEvent(null);
      return;
    }
    setExpandedEvent(event.event_id);
    setNoteSummary("");
    setNoteSentiment("neutral");
    setNoteMeetingType(event.meet_link ? "video" : "other");
    setNoteActionItems("");
    setNoteTranscriptionUrl("");
    setShowAdvanced(false);
  };

  const handleSaveNote = async (event: CalendarEvent, createTasks: boolean) => {
    setSaving(true);
    try {
      // First create the pre-filled note from calendar, then enrich with user input
      const note = await api().createMeetingNote({
        investor_id: event.matched_investor?.investor_id || "",
        project_id: event.matched_project?.project_id || "",
        meeting_date: event.start.includes("T") ? event.start.split("T")[0] : event.start,
        meeting_type: noteMeetingType,
        subject: event.title,
        attendees: event.attendees.join("; "),
        summary: noteSummary,
        action_items: noteActionItems,
        sentiment: noteSentiment,
        calendar_event_id: event.event_id,
        transcription_url: noteTranscriptionUrl,
        source: "calendar",
        created_by: teamId,
      } as Partial<MeetingNote>);

      if (createTasks && noteActionItems.trim()) {
        await api().generateTasksFromNote(note.note_id);
      }

      setExpandedEvent(null);
      loadWeekEvents(); // Refresh to update has_meeting_note
      onNoteCreated?.();
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = () => {
    window.location.href = `/api/auth/google?team_id=${teamId}`;
  };

  // Not connected state
  if (connected === false) {
    return (
      <div className="bg-surface-0 border border-brand-200/60 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-ink-700 mb-2">Today&apos;s Agenda</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">📅</span>
          </div>
          <p className="text-sm text-ink-500 mb-3">Connect your Google Calendar to see meetings</p>
          <button
            onClick={handleConnect}
            className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium"
          >
            Connect Google Calendar
          </button>
        </div>
      </div>
    );
  }

  if (connected === null) {
    return (
      <div className="bg-surface-0 border border-brand-200/60 rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-brand-200/40 rounded w-32"></div>
          <div className="h-10 bg-brand-200/40 rounded"></div>
          <div className="h-24 bg-brand-200/40 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-0 border border-brand-200/60 rounded-2xl">
      {/* Header */}
      <div className="px-5 py-3 border-b border-brand-200/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-700">Today&apos;s Agenda</h3>
        {email && <span className="text-xs text-ink-400">{email}</span>}
      </div>

      {/* Week day selector */}
      <div className="flex border-b border-brand-200/60">
        {weekDays.map((day) => (
          <button
            key={day.date}
            onClick={() => setSelectedDate(day.date)}
            className={`flex-1 py-2.5 text-center transition-colors relative ${
              selectedDate === day.date
                ? "bg-brand-50 border-b-2 border-brand-500"
                : "hover:bg-brand-50/50"
            }`}
          >
            <div className={`text-[10px] uppercase tracking-wide ${
              day.isToday ? "text-brand-600 font-bold" : "text-ink-400"
            }`}>{day.dayName}</div>
            <div className={`text-sm font-medium ${
              selectedDate === day.date ? "text-brand-700" : day.isToday ? "text-brand-600" : "text-ink-600"
            }`}>{day.label}</div>
            {(eventCountByDay.get(day.date) || 0) > 0 && (
              <div className="flex justify-center gap-0.5 mt-0.5">
                {Array.from({ length: Math.min(eventCountByDay.get(day.date) || 0, 3) }).map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-brand-500"></div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Events list */}
      <div className="p-3 space-y-2">
        {loading ? (
          <div className="animate-pulse space-y-2 py-2">
            <div className="h-12 bg-brand-200/40 rounded-lg"></div>
            <div className="h-12 bg-brand-200/40 rounded-lg"></div>
          </div>
        ) : dayEvents.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-ink-400">No meetings on this day</p>
          </div>
        ) : (
          dayEvents.map((event) => (
            <div key={event.event_id} className="border border-brand-200/60 rounded-xl overflow-hidden">
              {/* Event card */}
              <div className="px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-ink-400 font-medium mt-0.5 w-10 flex-shrink-0">
                    {formatTime(event.start)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{event.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {event.matched_investor && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded-md font-medium">
                          {event.matched_investor.investor_name}
                        </span>
                      )}
                      {event.has_meeting_note ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-medium">
                          Note created
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md font-medium">
                          No note
                        </span>
                      )}
                      {event.meet_link && (
                        <a
                          href={event.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-brand-500 hover:text-brand-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Meet link
                        </a>
                      )}
                    </div>
                  </div>
                  {!event.has_meeting_note && (
                    <button
                      onClick={() => handleExpandNote(event)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0 transition-colors ${
                        expandedEvent === event.event_id
                          ? "bg-brand-500 text-white"
                          : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                      }`}
                    >
                      {expandedEvent === event.event_id ? "Close" : "+ Note"}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline quick note form */}
              {expandedEvent === event.event_id && (
                <div className="border-t border-brand-200/60 bg-brand-50/30 px-3 py-3 space-y-3">
                  {/* Pre-filled info */}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="px-1.5 py-0.5 bg-surface-0 border border-brand-200/60 rounded text-ink-500">
                      {event.start.includes("T") ? event.start.split("T")[0] : event.start}
                    </span>
                    {event.matched_investor && (
                      <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded font-medium">
                        {event.matched_investor.investor_name}
                      </span>
                    )}
                    {event.attendees.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-surface-0 border border-brand-200/60 rounded text-ink-500">
                        {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Summary textarea */}
                  <textarea
                    value={noteSummary}
                    onChange={(e) => setNoteSummary(e.target.value)}
                    placeholder="Meeting summary — what happened, key takeaways..."
                    rows={3}
                    className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
                    autoFocus
                  />

                  {/* Sentiment pills */}
                  <div className="flex gap-1.5">
                    {(["positive", "neutral", "negative"] as Sentiment[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setNoteSentiment(s)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          noteSentiment === s
                            ? `${SENTIMENT_CONFIG[s].bg} ${SENTIMENT_CONFIG[s].color}`
                            : "bg-surface-0 text-ink-400 border border-brand-200/60 hover:bg-brand-50"
                        }`}
                      >
                        {SENTIMENT_CONFIG[s].label}
                      </button>
                    ))}
                  </div>

                  {/* Transcription URL */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={noteTranscriptionUrl}
                      onChange={(e) => setNoteTranscriptionUrl(e.target.value)}
                      placeholder="Granola / Otter transcription link (optional)"
                      className="flex-1 border border-brand-200 rounded-lg px-3 py-1.5 text-xs bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                  </div>

                  {/* Advanced section */}
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    {showAdvanced ? "▾ Hide advanced" : "▸ Advanced"}
                  </button>

                  {showAdvanced && (
                    <div className="space-y-2">
                      <select
                        value={noteMeetingType}
                        onChange={(e) => setNoteMeetingType(e.target.value as MeetingType)}
                        className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-xs bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      >
                        <option value="video">Video</option>
                        <option value="call">Call</option>
                        <option value="in_person">In Person</option>
                        <option value="email">Email</option>
                        <option value="other">Other</option>
                      </select>
                      <textarea
                        value={noteActionItems}
                        onChange={(e) => setNoteActionItems(e.target.value)}
                        placeholder="Action items (one per line — will be converted to ;; separated)"
                        rows={2}
                        className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-xs bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
                      />
                    </div>
                  )}

                  {/* Save buttons */}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setExpandedEvent(null)}
                      className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveNote(event, false)}
                      disabled={saving || !noteSummary.trim()}
                      className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors font-medium"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    {noteActionItems.trim() && (
                      <button
                        onClick={() => handleSaveNote(event, true)}
                        disabled={saving || !noteSummary.trim()}
                        className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
                      >
                        Save & Create Tasks
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
