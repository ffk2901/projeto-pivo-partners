"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink: string;
  attendees: string[];
  matchedInvestorNames: string[];
  hasMeetingNote: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  email?: string;
  reason?: "not_connected" | "token_revoked";
}

export default function CalendarWidget({ userId }: { userId: string }) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (!userId) return;
    try {
      const s = await api().getCalendarConnectionStatus();
      setStatus(s);
      if (s.connected) {
        const evts = await api().getCalendarEvents(undefined, "week");
        setEvents(evts as unknown as CalendarEvent[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check calendar");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleConnect = () => {
    window.location.href = "/api/auth/google";
  };

  if (loading) {
    return (
      <div className="bg-surface-0 border border-brand-200/60 rounded-2xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-brand-200/40 rounded w-40"></div>
          <div className="h-16 bg-brand-200/40 rounded"></div>
        </div>
      </div>
    );
  }

  if (!status || !status.connected) {
    const isRevoked = status?.reason === "token_revoked";
    return (
      <div className="bg-surface-0 border border-brand-200/60 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-ink-700 mb-2">Google Calendar</h3>
        <p className="text-xs text-ink-400 mb-3">
          {isRevoked
            ? "Your Google Calendar access was revoked. Please reconnect."
            : "Connect your Google Calendar to see upcoming meetings."}
        </p>
        <button
          onClick={handleConnect}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium"
        >
          {isRevoked ? "Reconnect Google Calendar" : "Connect Google Calendar"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-0 border border-brand-200/60 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-700">This Week</h3>
        <span className="text-xs text-ink-400">{status.email}</span>
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {events.length === 0 ? (
        <p className="text-xs text-ink-300 italic">No events this week</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <a
              key={event.id}
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-brand-200/60 rounded-xl px-3 py-2 hover:border-brand-400 transition-colors"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-ink-800 leading-snug">{event.summary}</p>
                {event.hasMeetingNote && (
                  <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-md ml-2 flex-shrink-0">
                    note
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-ink-400">
                  {formatEventTime(event.start)}
                </span>
                {event.matchedInvestorNames.length > 0 && (
                  <span className="text-xs text-brand-600 font-medium">
                    {event.matchedInvestorNames.join(", ")}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function formatEventTime(isoString: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
