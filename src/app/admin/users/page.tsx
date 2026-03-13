"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, UserProjectAccess } from "@/types";
import Modal from "@/components/Modal";

interface SafeUser {
  user_id: string;
  email: string;
  name: string;
  role: "admin" | "client";
  status: "active" | "inactive" | "pending";
  created_at: string;
  last_login: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "client">("client");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Access management
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [userAccess, setUserAccess] = useState<UserProjectAccess[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
      ]);
      if (!usersRes.ok) throw new Error("Failed to load users");
      if (!projectsRes.ok) throw new Error("Failed to load projects");
      setUsers(await usersRes.json());
      setProjects(await projectsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateUser = async () => {
    if (!formName || !formEmail || !formPassword) {
      setError("Name, email, and password are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, role: formRole, password: formPassword }),
      });
      if (!res.ok) {
        let msg = "Failed to create user";
        try { const data = await res.json(); msg = data.error || msg; } catch { /* non-JSON response */ }
        throw new Error(msg);
      }
      setShowCreate(false);
      setFormName(""); setFormEmail(""); setFormPassword(""); setFormRole("client");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: SafeUser) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, status: newStatus }),
      });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: resetUserId, new_password: newPassword }),
      });
      if (!res.ok) {
        let msg = "Failed to reset password";
        try { const data = await res.json(); msg = data.error || msg; } catch { /* non-JSON response */ }
        throw new Error(msg);
      }
      setResetUserId(null);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  const loadUserAccess = async (userId: string) => {
    setAccessUserId(userId);
    setAccessLoading(true);
    try {
      const res = await fetch(`/api/admin/user-access?user_id=${userId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load access");
      setUserAccess(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load access");
    } finally {
      setAccessLoading(false);
    }
  };

  const handleGrantAccess = async (projectId: string, permissionLevel: "view" | "edit") => {
    if (!accessUserId) return;
    try {
      const res = await fetch("/api/admin/user-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: accessUserId, project_id: projectId, permission_level: permissionLevel }),
      });
      if (!res.ok) {
        let msg = "Failed to grant access";
        try { const data = await res.json(); msg = data.error || msg; } catch { /* non-JSON response */ }
        throw new Error(msg);
      }
      loadUserAccess(accessUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant access");
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try {
      await fetch(`/api/admin/user-access?access_id=${accessId}`, { method: "DELETE" });
      if (accessUserId) loadUserAccess(accessUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke access");
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "Never";
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return iso; }
  };

  const inputClass = "w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-brand-200/40 rounded w-48"></div>
        <div className="h-64 bg-brand-200/40 rounded-2xl"></div>
      </div>
    );
  }

  const accessUser = users.find((u) => u.user_id === accessUserId);
  const assignedProjectIds = new Set(userAccess.map((a) => a.project_id));
  const availableProjects = projects.filter((p) => !assignedProjectIds.has(p.project_id));

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">User Management</h1>
          <p className="text-sm text-ink-400 mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
        >
          + New User
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs font-medium ml-4">Dismiss</button>
        </div>
      )}

      <div className="overflow-x-auto border border-brand-200/60 rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b border-brand-200/40">
              <th className="text-left px-4 py-3 text-ink-400 font-medium uppercase tracking-wide text-xs">Name</th>
              <th className="text-left px-4 py-3 text-ink-400 font-medium uppercase tracking-wide text-xs">Email</th>
              <th className="text-left px-4 py-3 text-ink-400 font-medium uppercase tracking-wide text-xs">Role</th>
              <th className="text-left px-4 py-3 text-ink-400 font-medium uppercase tracking-wide text-xs">Status</th>
              <th className="text-left px-4 py-3 text-ink-400 font-medium uppercase tracking-wide text-xs">Last Login</th>
              <th className="text-right px-4 py-3 text-ink-400 font-medium uppercase tracking-wide text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="border-b border-brand-100/40 hover:bg-brand-50/30 transition-colors">
                <td className="px-4 py-3 text-ink-800 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-ink-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    user.status === "inactive" ? "bg-ink-100 text-ink-500" : "bg-amber-100 text-amber-700"
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-400 text-xs">{formatDate(user.last_login)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {user.role === "client" && (
                      <button onClick={() => loadUserAccess(user.user_id)}
                        className="text-xs text-brand-500 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 font-medium">
                        Access
                      </button>
                    )}
                    <button onClick={() => setResetUserId(user.user_id)}
                      className="text-xs text-ink-400 hover:text-ink-700 px-2 py-1 rounded-lg hover:bg-brand-50">
                      Reset PW
                    </button>
                    <button onClick={() => handleToggleStatus(user)}
                      className={`text-xs px-2 py-1 rounded-lg ${
                        user.status === "active"
                          ? "text-red-500 hover:text-red-700 hover:bg-red-50"
                          : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}>
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Email</label>
            <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className={inputClass} placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Role</label>
            <select value={formRole} onChange={(e) => setFormRole(e.target.value as "admin" | "client")} className={inputClass}>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Password</label>
            <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className={inputClass} placeholder="At least 6 characters" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} disabled={saving} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Cancel</button>
            <button onClick={handleCreateUser} disabled={saving} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-medium disabled:opacity-50">
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetUserId} onClose={() => { setResetUserId(null); setNewPassword(""); }} title="Reset Password">
        <div className="space-y-3">
          <p className="text-sm text-ink-500">
            Reset password for <span className="font-medium text-ink-700">{users.find((u) => u.user_id === resetUserId)?.name}</span>
          </p>
          <div>
            <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="At least 6 characters" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setResetUserId(null); setNewPassword(""); }} disabled={saving} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700">Cancel</button>
            <button onClick={handleResetPassword} disabled={saving || newPassword.length < 6} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-medium disabled:opacity-50">
              {saving ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Access Management Modal */}
      <Modal open={!!accessUserId} onClose={() => setAccessUserId(null)} title={`Project Access — ${accessUser?.name || ""}`} wide>
        <div className="space-y-4">
          {accessLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-brand-200/40 rounded w-48"></div>
              <div className="h-4 bg-brand-200/40 rounded w-64"></div>
            </div>
          ) : (
            <>
              {/* Current access */}
              {userAccess.length > 0 ? (
                <div>
                  <h4 className="text-xs text-ink-400 uppercase tracking-wide mb-2">Current Access</h4>
                  <div className="space-y-2">
                    {userAccess.map((access) => {
                      const project = projects.find((p) => p.project_id === access.project_id);
                      return (
                        <div key={access.access_id} className="flex items-center justify-between bg-surface-50 border border-brand-200/60 rounded-xl px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-ink-700">{project?.project_name || access.project_id}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              access.permission_level === "edit" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {access.permission_level}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRevokeAccess(access.access_id)}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                          >
                            Revoke
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-400 italic">No project access granted yet.</p>
              )}

              {/* Grant new access */}
              {availableProjects.length > 0 && (
                <div>
                  <h4 className="text-xs text-ink-400 uppercase tracking-wide mb-2">Grant Access</h4>
                  <div className="space-y-2">
                    {availableProjects.map((project) => (
                      <div key={project.project_id} className="flex items-center justify-between bg-surface-0 border border-brand-200/60 rounded-xl px-4 py-2.5">
                        <p className="text-sm text-ink-700">{project.project_name}</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleGrantAccess(project.project_id, "view")}
                            className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleGrantAccess(project.project_id, "edit")}
                            className="text-xs text-emerald-500 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
