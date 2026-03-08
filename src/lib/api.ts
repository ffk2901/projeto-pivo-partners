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

export function api() {
  return {
    getTeam: () => fetchJson<import("@/types").TeamMember[]>("/api/team"),

    // Startups
    getStartups: () => fetchJson<import("@/types").Startup[]>("/api/startups"),
    createStartup: (d: Partial<import("@/types").Startup>) => post<import("@/types").Startup>("/api/startups", d),
    updateStartup: (d: Partial<import("@/types").Startup>) => put<import("@/types").Startup>("/api/startups", d),

    // Projects
    getProjects: (startupId?: string) => {
      const url = startupId ? `/api/projects?startup_id=${startupId}` : "/api/projects";
      return fetchJson<import("@/types").Project[]>(url);
    },
    createProject: (d: Partial<import("@/types").Project>) => post<import("@/types").Project>("/api/projects", d),
    updateProject: (d: Partial<import("@/types").Project>) => put<import("@/types").Project>("/api/projects", d),

    // Tasks
    getTasks: () => fetchJson<import("@/types").Task[]>("/api/tasks"),
    createTask: (d: Partial<import("@/types").Task>) => post<import("@/types").Task>("/api/tasks", d),
    updateTask: (d: Partial<import("@/types").Task>) => put<import("@/types").Task>("/api/tasks", d),

    // Investors
    getInvestors: () => fetchJson<import("@/types").Investor[]>("/api/investors"),
    createInvestor: (d: Partial<import("@/types").Investor>) => post<import("@/types").Investor>("/api/investors", d),
    updateInvestor: (d: Partial<import("@/types").Investor>) => put<import("@/types").Investor>("/api/investors", d),

    // Project-Investors
    getProjectInvestors: (projectId?: string) => {
      const url = projectId ? `/api/project-investors?project_id=${projectId}` : "/api/project-investors";
      return fetchJson<import("@/types").ProjectInvestor[]>(url);
    },
    createProjectInvestor: (d: Partial<import("@/types").ProjectInvestor>) =>
      post<import("@/types").ProjectInvestor>("/api/project-investors", d),
    updateProjectInvestor: (d: Partial<import("@/types").ProjectInvestor>) =>
      put<import("@/types").ProjectInvestor>("/api/project-investors", d),
    deleteProjectInvestor: (linkId: string) =>
      fetchJson<{ success: boolean }>(`/api/project-investors?link_id=${linkId}`, { method: "DELETE" }),

    // Startup-Investors (legacy)
    getStartupInvestors: (startupId?: string) => {
      const url = startupId ? `/api/startup-investors?startup_id=${startupId}` : "/api/startup-investors";
      return fetchJson<import("@/types").StartupInvestor[]>(url);
    },
    createStartupInvestor: (d: Partial<import("@/types").StartupInvestor>) =>
      post<import("@/types").StartupInvestor>("/api/startup-investors", d),
    updateStartupInvestor: (d: Partial<import("@/types").StartupInvestor>) =>
      put<import("@/types").StartupInvestor>("/api/startup-investors", d),

    // Config
    getConfig: () => fetchJson<{ config: import("@/types").ConfigRow[]; pipeline_stages: string[] }>("/api/config"),

    // Team update
    updateTeamMember: (d: Partial<import("@/types").TeamMember>) => put<import("@/types").TeamMember>("/api/team", d),

    // Project Notes
    getProjectNotes: (projectId?: string, investorId?: string) => {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (investorId) params.set("investor_id", investorId);
      const qs = params.toString();
      const url = qs ? `/api/project-notes?${qs}` : "/api/project-notes";
      return fetchJson<import("@/types").ProjectNote[]>(url);
    },
    createProjectNote: (d: Partial<import("@/types").ProjectNote>) =>
      post<import("@/types").ProjectNote>("/api/project-notes", d),
    updateProjectNote: (d: Partial<import("@/types").ProjectNote>) =>
      put<import("@/types").ProjectNote>("/api/project-notes", d),
    deleteProjectNote: (noteId: string) =>
      fetchJson<{ success: boolean }>(`/api/project-notes?note_id=${noteId}`, { method: "DELETE" }),

    // Meetings
    getMeetings: (projectId?: string, investorId?: string) => {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (investorId) params.set("investor_id", investorId);
      const qs = params.toString();
      const url = qs ? `/api/meetings?${qs}` : "/api/meetings";
      return fetchJson<import("@/types").Meeting[]>(url);
    },
    createMeeting: (d: Partial<import("@/types").Meeting>) =>
      post<import("@/types").Meeting>("/api/meetings", d),
    updateMeeting: (d: Partial<import("@/types").Meeting>) =>
      put<import("@/types").Meeting>("/api/meetings", d),
    deleteMeeting: (meetingId: string) =>
      fetchJson<{ success: boolean }>(`/api/meetings?meeting_id=${meetingId}`, { method: "DELETE" }),

    // Activity Log
    getActivityLog: (projectId?: string, investorId?: string) => {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (investorId) params.set("investor_id", investorId);
      const qs = params.toString();
      const url = qs ? `/api/activity-log?${qs}` : "/api/activity-log";
      return fetchJson<import("@/types").ActivityLogEntry[]>(url);
    },

    // Meeting Report
    getMeetingReport: (projectId: string) =>
      fetchJson<Record<string, unknown>>(`/api/meeting-report?project_id=${projectId}`),

    // Calendar Sync
    syncTaskToCalendar: (taskId: string) =>
      post<{ success: boolean; task: import("@/types").Task; eventId?: string }>("/api/calendar-sync", { task_id: taskId }),
    unsyncTaskFromCalendar: (taskId: string) =>
      post<{ success: boolean; task: import("@/types").Task }>("/api/calendar-sync", { task_id: taskId, action: "unsync" }),
  };
}
