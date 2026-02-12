// Centralized fetch helpers for client components

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function api() {
  return {
    // Team
    getTeam: () => fetchJson<import("@/types").TeamMember[]>("/api/team"),

    // Startups
    getStartups: () =>
      fetchJson<import("@/types").Startup[]>("/api/startups"),
    createStartup: (data: Partial<import("@/types").Startup>) =>
      fetchJson<import("@/types").Startup>("/api/startups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    updateStartup: (data: Partial<import("@/types").Startup>) =>
      fetchJson<import("@/types").Startup>("/api/startups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Tasks
    getTasks: () => fetchJson<import("@/types").Task[]>("/api/tasks"),
    createTask: (data: Partial<import("@/types").Task>) =>
      fetchJson<import("@/types").Task>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    updateTask: (data: Partial<import("@/types").Task>) =>
      fetchJson<import("@/types").Task>("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Investors
    getInvestors: () =>
      fetchJson<import("@/types").Investor[]>("/api/investors"),
    createInvestor: (data: Partial<import("@/types").Investor>) =>
      fetchJson<import("@/types").Investor>("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    updateInvestor: (data: Partial<import("@/types").Investor>) =>
      fetchJson<import("@/types").Investor>("/api/investors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Startup-Investors
    getStartupInvestors: (startupId?: string) => {
      const url = startupId
        ? `/api/startup-investors?startup_id=${startupId}`
        : "/api/startup-investors";
      return fetchJson<import("@/types").StartupInvestor[]>(url);
    },
    createStartupInvestor: (
      data: Partial<import("@/types").StartupInvestor>
    ) =>
      fetchJson<import("@/types").StartupInvestor>("/api/startup-investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    updateStartupInvestor: (
      data: Partial<import("@/types").StartupInvestor>
    ) =>
      fetchJson<import("@/types").StartupInvestor>("/api/startup-investors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Config
    getConfig: () =>
      fetchJson<{
        config: import("@/types").ConfigRow[];
        pipeline_stages: string[];
      }>("/api/config"),
  };
}
