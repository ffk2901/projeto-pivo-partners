import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/db";
import { testCalendarConnection } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await healthCheck();

  let calendarConnected = false;
  let calendarError = "";
  try {
    const calResult = await testCalendarConnection();
    calendarConnected = calResult.connected;
    calendarError = calResult.error || "";
  } catch (err) {
    calendarError = err instanceof Error ? err.message : "Unknown error";
  }

  return NextResponse.json({
    ...result,
    calendar: { connected: calendarConnected, error: calendarError },
  });
}
