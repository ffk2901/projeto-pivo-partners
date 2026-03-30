// Centralized fetch helpers for client components

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function post<T>(url: string, data: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function put<T>(url: string, data: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function api(prefix = "/api") {
  return {
    getTeam: () => fetchJson<import("@/types").TeamMember[]>(`${prefix}/team`),

    // Startups
    getStartups: () => fetchJson<import("@/types").Startup[]>(`${prefix}/startups`),
    createStartup: (d: Partial<import("@/types").Startup>) => post<import("@/types").Startup>(`${prefix}/startups`, d),
    updateStartup: (d: Partial<import("@/types").Startup>) => put<import("@/types").Startup>(`${prefix}/startups`, d),

    // Projects
    getProjects: (startupId?: string) => {
      const url = startupId ? `${prefix}/projects?startup_id=${startupId}` : `${prefix}/projects`;
      return fetchJson<import("@/types").Project[]>(url);
    },
    createProject: (d: Partial<import("@/types").Project>) => post<import("@/types").Project>(`${prefix}/projects`, d),
    updateProject: (d: Partial<import("@/types").Project>) => put<import("@/types").Project>(`${prefix}/projects`, d),

    // Tasks
    getTasks: () => fetchJson<import("@/types").Task[]>(`${prefix}/tasks`),
    createTask: (d: Partial<import("@/types").Task>) => post<import("@/types").Task>(`${prefix}/tasks`, d),
    updateTask: (d: Partial<import("@/types").Task>) => put<import("@/types").Task>(`${prefix}/tasks`, d),

    // Investors
    getInvestors: () => fetchJson<import("@/types").Investor[]>(`${prefix}/investors`),
    createInvestor: (d: Partial<import("@/types").Investor>) => post<import("@/types").Investor>(`${prefix}/investors`, d),
    updateInvestor: (d: Partial<import("@/types").Investor>) => put<import("@/types").Investor>(`${prefix}/investors`, d),
    deleteInvestor: (investorId: string) =>
      fetchJson<{ success: boolean }>(`${prefix}/investors?investor_id=${investorId}`, { method: "DELETE" }),

    // Project-Investors
    getProjectInvestors: (projectId?: string) => {
      const url = projectId ? `${prefix}/project-investors?project_id=${projectId}` : `${prefix}/project-investors`;
      return fetchJson<import("@/types").ProjectInvestor[]>(url);
    },
    createProjectInvestor: (d: Partial<import("@/types").ProjectInvestor>) =>
      post<import("@/types").ProjectInvestor>(`${prefix}/project-investors`, d),
    updateProjectInvestor: (d: Partial<import("@/types").ProjectInvestor>) =>
      put<import("@/types").ProjectInvestor>(`${prefix}/project-investors`, d),
    deleteProjectInvestor: (linkId: string) =>
      fetchJson<{ success: boolean }>(`${prefix}/project-investors?link_id=${linkId}`, { method: "DELETE" }),

    // Startup-Investors (legacy)
    getStartupInvestors: (startupId?: string) => {
      const url = startupId ? `${prefix}/startup-investors?startup_id=${startupId}` : `${prefix}/startup-investors`;
      return fetchJson<import("@/types").StartupInvestor[]>(url);
    },
    createStartupInvestor: (d: Partial<import("@/types").StartupInvestor>) =>
      post<import("@/types").StartupInvestor>(`${prefix}/startup-investors`, d),
    updateStartupInvestor: (d: Partial<import("@/types").StartupInvestor>) =>
      put<import("@/types").StartupInvestor>(`${prefix}/startup-investors`, d),

    // Config
    getConfig: () => fetchJson<{ config: import("@/types").ConfigRow[]; pipeline_stages: string[] }>(`${prefix}/config`),

    // Team update
    updateTeamMember: (d: Partial<import("@/types").TeamMember>) => put<import("@/types").TeamMember>(`${prefix}/team`, d),

    // Project Notes
    getProjectNotes: (projectId?: string, investorId?: string) => {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (investorId) params.set("investor_id", investorId);
      const qs = params.toString();
      const url = qs ? `${prefix}/project-notes?${qs}` : `${prefix}/project-notes`;
      return fetchJson<import("@/types").ProjectNote[]>(url);
    },
    createProjectNote: (d: Partial<import("@/types").ProjectNote>) =>
      post<import("@/types").ProjectNote>(`${prefix}/project-notes`, d),
    updateProjectNote: (d: Partial<import("@/types").ProjectNote>) =>
      put<import("@/types").ProjectNote>(`${prefix}/project-notes`, d),
    deleteProjectNote: (noteId: string) =>
      fetchJson<{ success: boolean }>(`${prefix}/project-notes?note_id=${noteId}`, { method: "DELETE" }),

    // Meetings
    getMeetings: (projectId?: string, investorId?: string) => {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (investorId) params.set("investor_id", investorId);
      const qs = params.toString();
      const url = qs ? `${prefix}/meetings?${qs}` : `${prefix}/meetings`;
      return fetchJson<import("@/types").Meeting[]>(url);
    },
    createMeeting: (d: Partial<import("@/types").Meeting>) =>
      post<import("@/types").Meeting>(`${prefix}/meetings`, d),
    updateMeeting: (d: Partial<import("@/types").Meeting>) =>
      put<import("@/types").Meeting>(`${prefix}/meetings`, d),
    deleteMeeting: (meetingId: string) =>
      fetchJson<{ success: boolean }>(`${prefix}/meetings?meeting_id=${meetingId}`, { method: "DELETE" }),

    // Activity Log
    getActivityLog: (projectId?: string, investorId?: string) => {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (investorId) params.set("investor_id", investorId);
      const qs = params.toString();
      const url = qs ? `${prefix}/activity-log?${qs}` : `${prefix}/activity-log`;
      return fetchJson<import("@/types").ActivityLogEntry[]>(url);
    },

    // Meeting Notes
    getMeetingNotes: (params?: { investor_id?: string; project_id?: string; startup_id?: string }) => {
      const sp = new URLSearchParams();
      if (params?.investor_id) sp.set("investor_id", params.investor_id);
      if (params?.project_id) sp.set("project_id", params.project_id);
      if (params?.startup_id) sp.set("startup_id", params.startup_id);
      const qs = sp.toString();
      const url = qs ? `${prefix}/meeting-notes?${qs}` : `${prefix}/meeting-notes`;
      return fetchJson<import("@/types").MeetingNote[]>(url);
    },
    createMeetingNote: (d: Partial<import("@/types").MeetingNote>) =>
      post<import("@/types").MeetingNote>(`${prefix}/meeting-notes`, d),

    // Meeting Report
    getMeetingReport: (projectId: string) =>
      fetchJson<Record<string, unknown>>(`${prefix}/meeting-report?project_id=${projectId}`),

    // Calendar Sync
    syncTaskToCalendar: (taskId: string) =>
      post<{ success: boolean; task: import("@/types").Task; eventId?: string }>(`${prefix}/calendar-sync`, { task_id: taskId }),
    unsyncTaskFromCalendar: (taskId: string) =>
      post<{ success: boolean; task: import("@/types").Task }>(`${prefix}/calendar-sync`, { task_id: taskId, action: "unsync" }),

    // Google Calendar (user OAuth)
    getCalendarConnectionStatus: () =>
      fetchJson<{ connected: boolean; email?: string; reason?: "not_connected" | "token_revoked" }>(`${prefix}/auth/status`),
    getCalendarEvents: (date?: string, range?: "week") => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (range) params.set("range", range);
      const qs = params.toString();
      const url = qs ? `${prefix}/calendar/events?${qs}` : `${prefix}/calendar/events`;
      return fetchJson<Record<string, unknown>[]>(url);
    },
    createNoteFromCalendar: (calendarEventId: string, projectId: string, investorId?: string) =>
      post<unknown>(`${prefix}/meeting-notes/from-calendar`, {
        calendar_event_id: calendarEventId,
        project_id: projectId,
        investor_id: investorId || "",
      }),
  };
}
