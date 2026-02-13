// Centralized fetch helpers for client components

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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

    // Project-Investors (replaces startup-investors)
    getProjectInvestors: (projectId?: string) => {
      const url = projectId ? `/api/project-investors?project_id=${projectId}` : "/api/project-investors";
      return fetchJson<import("@/types").ProjectInvestor[]>(url);
    },
    createProjectInvestor: (d: Partial<import("@/types").ProjectInvestor>) =>
      post<import("@/types").ProjectInvestor>("/api/project-investors", d),
    updateProjectInvestor: (d: Partial<import("@/types").ProjectInvestor>) =>
      put<import("@/types").ProjectInvestor>("/api/project-investors", d),

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
  };
}
