import { google, calendar_v3 } from "googleapis";
import { getValidToken } from "./auth-google";
import { getInvestors, getProjectInvestors, getMeetings } from "./db";

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string; // ISO datetime
  end: string;
  htmlLink: string;
  attendees: string[];
  // CRM enrichment
  matchedInvestorIds: string[];
  matchedInvestorNames: string[];
  hasMeetingNote: boolean;
}

function getOAuth2ClientForUser(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

export async function getUserCalendarEvents(
  userId: string,
  date?: string,
  range?: "week"
): Promise<CalendarEvent[]> {
  const token = await getValidToken(userId);
  if (!token) return [];

  const auth = getOAuth2ClientForUser(token.access_token);
  const calendar = google.calendar({ version: "v3", auth });

  // Calculate time range
  let timeMin: string;
  let timeMax: string;
  const baseDate = date ? new Date(date + "T00:00:00") : new Date();
  baseDate.setHours(0, 0, 0, 0);

  if (range === "week") {
    const day = baseDate.getDay();
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    timeMin = monday.toISOString();
    timeMax = sunday.toISOString();
  } else {
    timeMin = baseDate.toISOString();
    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);
    timeMax = endOfDay.toISOString();
  }

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  const events = (res.data.items || []).map(mapGoogleEvent);
  return enrichEventsWithCRM(events);
}

export async function getUserCalendarEvent(
  userId: string,
  calendarEventId: string
): Promise<CalendarEvent | null> {
  const token = await getValidToken(userId);
  if (!token) return null;

  const auth = getOAuth2ClientForUser(token.access_token);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const res = await calendar.events.get({
      calendarId: "primary",
      eventId: calendarEventId,
    });
    if (!res.data) return null;
    const event = mapGoogleEvent(res.data);
    const enriched = await enrichEventsWithCRM([event]);
    return enriched[0] || null;
  } catch {
    return null;
  }
}

function mapGoogleEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: event.id || "",
    summary: event.summary || "(No title)",
    description: event.description || "",
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    htmlLink: event.htmlLink || "",
    attendees: (event.attendees || [])
      .map((a) => a.email || "")
      .filter(Boolean),
    matchedInvestorIds: [],
    matchedInvestorNames: [],
    hasMeetingNote: false,
  };
}

async function enrichEventsWithCRM(
  events: CalendarEvent[]
): Promise<CalendarEvent[]> {
  if (events.length === 0) return events;

  const [investors, projectInvestors, meetings] = await Promise.all([
    getInvestors(),
    getProjectInvestors(),
    getMeetings(),
  ]);

  // Build email → investor lookup
  const emailToInvestor = new Map<string, { id: string; name: string }>();
  for (const inv of investors) {
    if (inv.email) {
      emailToInvestor.set(inv.email.toLowerCase(), {
        id: inv.investor_id,
        name: inv.investor_name,
      });
    }
  }

  // Build calendar_event_id set for meeting note detection
  const meetingEventIds = new Set(
    meetings
      .filter((m) => m.calendar_event_id)
      .map((m) => m.calendar_event_id)
  );

  return events.map((event) => {
    // Match attendees to investors
    const matchedIds: string[] = [];
    const matchedNames: string[] = [];
    for (const email of event.attendees) {
      const inv = emailToInvestor.get(email.toLowerCase());
      if (inv && !matchedIds.includes(inv.id)) {
        matchedIds.push(inv.id);
        matchedNames.push(inv.name);
      }
    }

    // Also check summary/description for investor names
    const summaryLower = (event.summary + " " + event.description).toLowerCase();
    for (const inv of investors) {
      if (
        inv.investor_name &&
        summaryLower.includes(inv.investor_name.toLowerCase()) &&
        !matchedIds.includes(inv.investor_id)
      ) {
        matchedIds.push(inv.investor_id);
        matchedNames.push(inv.investor_name);
      }
    }

    return {
      ...event,
      matchedInvestorIds: matchedIds,
      matchedInvestorNames: matchedNames,
      hasMeetingNote: meetingEventIds.has(event.id),
    };
  });
}
