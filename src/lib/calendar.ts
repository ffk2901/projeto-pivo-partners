import { google, calendar_v3 } from "googleapis";
import { getValidToken } from "./auth-google";
import { getInvestors, getProjectInvestors, getMeetingNotes } from "./sheets";
import type { CalendarEvent, Investor, Project } from "@/types";

let calendarInstance: calendar_v3.Calendar | null = null;

function getCalendar(): calendar_v3.Calendar {
  if (calendarInstance) return calendarInstance;
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  calendarInstance = google.calendar({ version: "v3", auth });
  return calendarInstance;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (24h)
  attendeeEmail: string;
  additionalEmails?: string[];
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
  const calendar = getCalendar();

  const event: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description || "",
    attendees: [
      { email: input.attendeeEmail },
      ...(input.additionalEmails || []).filter(Boolean).map((e) => ({ email: e })),
    ],
  };

  if (input.time) {
    // Timed event
    const startDateTime = `${input.date}T${input.time}:00`;
    const startDate = new Date(`${startDateTime}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
    event.start = { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" };
    event.end = { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" };
  } else {
    // All-day event
    event.start = { date: input.date };
    event.end = { date: input.date };
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
    sendUpdates: "all",
  });

  return {
    eventId: res.data.id || "",
    htmlLink: res.data.htmlLink || "",
  };
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<CalendarEventResult> {
  const calendar = getCalendar();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  // Get existing event
  const existing = await calendar.events.get({ calendarId, eventId });
  const event = existing.data;

  if (input.summary) event.summary = input.summary;
  if (input.description !== undefined) event.description = input.description;

  if (input.date) {
    if (input.time) {
      const startDateTime = `${input.date}T${input.time}:00`;
      const startDate = new Date(`${startDateTime}`);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      event.start = { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" };
      event.end = { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" };
    } else {
      event.start = { date: input.date };
      event.end = { date: input.date };
    }
  }

  if (input.attendeeEmail) {
    event.attendees = [
      { email: input.attendeeEmail },
      ...(input.additionalEmails || []).filter(Boolean).map((e) => ({ email: e })),
    ];
  }

  const res = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
    sendUpdates: "all",
  });

  return {
    eventId: res.data.id || "",
    htmlLink: res.data.htmlLink || "",
  };
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = getCalendar();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  await calendar.events.delete({ calendarId, eventId, sendUpdates: "all" });
}

// ============================================
// OAuth2-based user calendar (read-only)
// ============================================

async function getUserCalendarClient(teamId: string) {
  const accessToken = await getValidToken(teamId);
  if (!accessToken) throw new Error("No valid calendar token. Please connect Google Calendar.");

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

export async function getUserCalendarEvents(
  teamId: string,
  date?: string,
  range?: "week"
): Promise<CalendarEvent[]> {
  const calendar = await getUserCalendarClient(teamId);

  let timeMin: string;
  let timeMax: string;

  if (range === "week") {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    timeMin = monday.toISOString();
    timeMax = friday.toISOString();
  } else if (date) {
    timeMin = new Date(`${date}T00:00:00`).toISOString();
    timeMax = new Date(`${date}T23:59:59`).toISOString();
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    timeMin = today.toISOString();
    timeMax = endOfDay.toISOString();
  }

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const events: CalendarEvent[] = (res.data.items || []).map((item) => ({
    event_id: item.id || "",
    title: item.summary || "(No title)",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    attendees: (item.attendees || []).map((a) => a.email || "").filter(Boolean),
    description: item.description || "",
    meet_link: item.hangoutLink || item.conferenceData?.entryPoints?.[0]?.uri || undefined,
  }));

  return enrichEventsWithCRM(events);
}

export async function getUserCalendarEvent(
  teamId: string,
  eventId: string
): Promise<CalendarEvent | null> {
  const calendar = await getUserCalendarClient(teamId);

  try {
    const res = await calendar.events.get({ calendarId: "primary", eventId });
    const item = res.data;
    const event: CalendarEvent = {
      event_id: item.id || "",
      title: item.summary || "(No title)",
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
      attendees: (item.attendees || []).map((a) => a.email || "").filter(Boolean),
      description: item.description || "",
      meet_link: item.hangoutLink || item.conferenceData?.entryPoints?.[0]?.uri || undefined,
    };
    const enriched = await enrichEventsWithCRM([event]);
    return enriched[0] || null;
  } catch {
    return null;
  }
}

async function enrichEventsWithCRM(events: CalendarEvent[]): Promise<CalendarEvent[]> {
  const [investors, piLinks, meetingNotes] = await Promise.all([
    getInvestors(),
    getProjectInvestors(),
    getMeetingNotes(),
  ]);

  const emailToInvestor = new Map<string, Investor>();
  for (const inv of investors) {
    if (inv.email) emailToInvestor.set(inv.email.toLowerCase(), inv);
  }

  const notesByEventId = new Set(
    meetingNotes.filter((n) => n.calendar_event_id).map((n) => n.calendar_event_id)
  );

  return events.map((event) => {
    let matched_investor: Investor | undefined;
    for (const email of event.attendees) {
      const inv = emailToInvestor.get(email.toLowerCase());
      if (inv) { matched_investor = inv; break; }
    }

    let matched_project: Project | undefined;
    if (matched_investor) {
      const links = piLinks
        .filter((l) => l.investor_id === matched_investor!.investor_id)
        .sort((a, b) => (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || ""));
      if (links.length > 0) {
        matched_project = { project_id: links[0].project_id } as Project;
      }
    }

    return {
      ...event,
      matched_investor,
      matched_project,
      has_meeting_note: notesByEventId.has(event.event_id),
    };
  });
}
