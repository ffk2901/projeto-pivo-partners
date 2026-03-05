import { google, calendar_v3 } from "googleapis";

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
