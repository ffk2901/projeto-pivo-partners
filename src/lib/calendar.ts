import { google, calendar_v3 } from "googleapis";

let calendarInstance: calendar_v3.Calendar | null = null;

function getCalendar(): calendar_v3.Calendar {
  if (calendarInstance) return calendarInstance;

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google Calendar not configured — set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
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

/**
 * Tests Calendar API connectivity by listing 1 event.
 */
export async function testCalendarConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const calendar = getCalendar();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    await calendar.events.list({
      calendarId,
      maxResults: 1,
      timeMin: new Date().toISOString(),
    });
    return { connected: true };
  } catch (err) {
    const message = parseCalendarError(err);
    return { connected: false, error: message };
  }
}

function parseCalendarError(err: unknown): string {
  if (!(err instanceof Error)) return "Unknown calendar error";
  const msg = err.message || "";

  if (msg.includes("invalid_grant") || msg.includes("Invalid JWT")) {
    return "Calendar authentication failed — check service account credentials";
  }
  if (msg.includes("notFound") || msg.includes("Not Found")) {
    return "Calendar not found — check GOOGLE_CALENDAR_ID or ensure the calendar is shared with the service account";
  }
  if (msg.includes("forbidden") || msg.includes("insufficientPermissions") || msg.includes("403")) {
    return "Calendar permission denied — ensure the service account has Editor access to the target calendar";
  }
  if (msg.includes("Calendar API") || msg.includes("accessNotConfigured") || msg.includes("has not been used")) {
    return "Calendar API not enabled — enable the Google Calendar API in Google Cloud Console";
  }
  return `Calendar error: ${msg}`;
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
  if (!input.attendeeEmail) {
    throw new Error("Cannot create calendar event — no attendee email provided");
  }

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
    const startDateTime = `${input.date}T${input.time}:00`;
    const startDate = new Date(`${startDateTime}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    event.start = { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" };
    event.end = { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" };
  } else {
    event.start = { date: input.date };
    event.end = { date: input.date };
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: "all",
    });

    return {
      eventId: res.data.id || "",
      htmlLink: res.data.htmlLink || "",
    };
  } catch (err) {
    throw new Error(parseCalendarError(err));
  }
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<CalendarEventResult> {
  const calendar = getCalendar();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
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
  } catch (err) {
    const msg = parseCalendarError(err);
    if (msg.includes("not found") || msg.includes("Not Found")) {
      throw new Error("Calendar event not found (may have been deleted externally)");
    }
    throw new Error(msg);
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = getCalendar();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    await calendar.events.delete({ calendarId, eventId, sendUpdates: "all" });
  } catch (err) {
    const msg = parseCalendarError(err);
    if (msg.includes("not found") || msg.includes("Not Found")) {
      // Event already deleted externally — not an error
      return;
    }
    throw new Error(msg);
  }
}
