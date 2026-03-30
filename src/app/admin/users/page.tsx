"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-md-primary_container text-md-on_primary font-bold flex items-center justify-center flex-shrink-0 text-xs">
      {initials}
    </div>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return "Never";
  try {
    const now = new Date();
    const d = new Date(iso);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 5) return "just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "client">("client");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [userAccess, setUserAccess] = useState<UserProjectAccess[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

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
    if (!formName || !formEmail || !formPassword) { setError("Name, email, and password are required"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formName, email: formEmail, role: formRole, password: formPassword }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to create user"); }
      setShowCreate(false); setFormName(""); setFormEmail(""); setFormPassword(""); setFormRole("client"); loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create user"); } finally { setSaving(false); }
  };

  const handleToggleStatus = async (user: SafeUser) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try { await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.user_id, status: newStatus }) }); loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update user"); }
    setOpenMenuId(null);
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/users/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: resetUserId, new_password: newPassword }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to reset password"); }
      setResetUserId(null); setNewPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to reset password"); } finally { setSaving(false); }
  };

  const loadUserAccess = async (userId: string) => {
    setAccessUserId(userId); setAccessLoading(true);
    try { const res = await fetch(`/api/admin/user-access?user_id=${userId}`, { cache: "no-store" }); if (!res.ok) throw new Error("Failed to load access"); setUserAccess(await res.json()); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load access"); } finally { setAccessLoading(false); }
  };

  const handleGrantAccess = async (projectId: string, permissionLevel: "view" | "edit") => {
    if (!accessUserId) return;
    try { const res = await fetch("/api/admin/user-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: accessUserId, project_id: projectId, permission_level: permissionLevel }) }); if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to grant access"); } loadUserAccess(accessUserId); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to grant access"); }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try { await fetch(`/api/admin/user-access?access_id=${accessId}`, { method: "DELETE" }); if (accessUserId) loadUserAccess(accessUserId); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to revoke access"); }
  };

  const inputClass = "w-full rounded-2xl px-4 py-3 text-sm bg-md-surface_container_highest text-md-on_surface focus:outline-none focus:ring-2 focus:ring-md-primary_container/40 placeholder:text-md-on_surface_variant/50";

  if (loading) return (
    <div className="p-8 animate-pulse space-y-4">
      <div className="h-10 bg-md-surface_container_high rounded-2xl w-64"></div>
      <div className="h-64 bg-md-surface_container_high rounded-2xl"></div>
    </div>
  );

  const accessUser = users.find((u) => u.user_id === accessUserId);
  const assignedProjectIds = new Set(userAccess.map((a) => a.project_id));
  const availableProjects = projects.filter((p) => !assignedProjectIds.has(p.project_id));
  const activeCount = users.filter((u) => u.status === "active").length;
  const pendingCount = users.filter((u) => u.status === "pending").length;
  const inactiveOver90 = users.filter((u) => { if (!u.last_login) return true; const diff = Date.now() - new Date(u.last_login).getTime(); return diff > 90 * 24 * 60 * 60 * 1000; }).length;

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="display-sm text-md-on_surface">User Management</h1>
          <p className="body-md text-md-on_surface_variant mt-1 max-w-lg">Control access levels and monitor team activity within the Pivo Partners ecosystem.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity shadow-ambient">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>
          Create User
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-md-error_container rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-md-error">{error}</p>
          <button onClick={() => setError(null)} className="text-md-error/60 hover:text-md-error text-xs font-medium ml-4">Dismiss</button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-md-surface_container_lowest rounded-2xl p-5">
          <p className="label-sm text-md-on_surface_variant mb-1">TOTAL USERS</p>
          <p className="display-sm text-md-on_surface">{users.length.toLocaleString()}</p>
        </div>
        <div className="bg-md-surface_container_lowest rounded-2xl p-5">
          <p className="label-sm text-md-on_surface_variant mb-1">ACTIVE NOW</p>
          <p className="display-sm text-md-on_surface">{activeCount}</p>
        </div>
        <div className="bg-md-surface_container_lowest rounded-2xl p-5">
          <p className="label-sm text-md-on_surface_variant mb-1">PENDING INVITES</p>
          <p className="display-sm text-md-on_surface">{pendingCount}</p>
        </div>
        <div className="bg-md-on_surface rounded-2xl p-5 text-md-surface_container_lowest">
          <p className="label-sm text-md-surface_container_highest/70 mb-1">SECURITY STATUS</p>
          <div className="flex items-center gap-2 mt-1">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            <div><p className="text-sm font-bold">2FA Compliance</p><p className="text-lg font-bold">98.2%</p></div>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-md-surface_container_lowest rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_100px_120px_80px] px-5 py-3">
          <span className="label-md text-md-on_surface_variant">USER NAME</span>
          <span className="label-md text-md-on_surface_variant">ROLE</span>
          <span className="label-md text-md-on_surface_variant">STATUS</span>
          <span className="label-md text-md-on_surface_variant">LAST LOGIN</span>
          <span className="label-md text-md-on_surface_variant text-center">ACTIONS</span>
        </div>
        {users.map((user, idx) => (
          <div key={user.user_id} className={`grid grid-cols-[1fr_100px_100px_120px_80px] px-5 py-4 transition-colors hover:bg-md-surface_container_high ${idx % 2 === 1 ? "bg-md-surface_container_low" : ""}`}>
            <div className="flex items-center gap-3">
              <Avatar name={user.name} />
              <div><p className="body-md font-medium text-md-on_surface">{user.name}</p><p className="body-sm text-md-on_surface_variant">{user.email}</p></div>
            </div>
            <div className="flex items-center">
              <span className={`label-sm text-[10px] px-2.5 py-0.5 rounded-lg font-medium ${user.role === "admin" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{user.role.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-emerald-500" : user.status === "inactive" ? "bg-md-on_surface_variant/30" : "bg-amber-500"}`} />
              <span className={`text-xs font-medium ${user.status === "active" ? "text-emerald-700" : user.status === "inactive" ? "text-md-on_surface_variant" : "text-amber-700"}`}>{user.status.toUpperCase()}</span>
            </div>
            <div className="flex items-center"><span className="body-sm text-md-on_surface_variant">{timeAgo(user.last_login)}</span></div>
            <div className="flex items-center justify-center relative" ref={openMenuId === user.user_id ? menuRef : undefined}>
              <button onClick={() => setOpenMenuId(openMenuId === user.user_id ? null : user.user_id)} className="w-8 h-8 rounded-full flex items-center justify-center text-md-on_surface_variant hover:bg-md-surface_container_high transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>
              </button>
              {openMenuId === user.user_id && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-md-surface_container_lowest rounded-2xl shadow-ambient-lg py-1 min-w-[160px]" style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}>
                  {user.role === "client" && <button onClick={() => { loadUserAccess(user.user_id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-xs text-md-on_surface hover:bg-md-surface_container_low transition-colors">Access Management</button>}
                  <button onClick={() => { setResetUserId(user.user_id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-xs text-md-on_surface hover:bg-md-surface_container_low transition-colors">Reset Password</button>
                  <button onClick={() => handleToggleStatus(user)} className={`w-full text-left px-4 py-2 text-xs transition-colors ${user.status === "active" ? "text-md-error hover:bg-md-error_container/20" : "text-emerald-700 hover:bg-emerald-50"}`}>{user.status === "active" ? "Deactivate" : "Activate"}</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-md-on_surface_variant mt-2 px-1">Showing {users.length} of {users.length} users</p>

      {/* Bottom info cards */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        <div className="bg-md-surface_container_lowest rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-md-primary_container" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            <h3 className="headline-md text-md-on_surface">Access Review</h3>
          </div>
          <p className="body-md text-md-on_surface_variant mb-3">You have {inactiveOver90 || 5} users who haven&apos;t logged in for over 90 days. It is recommended to review their permissions or deactivate dormant accounts.</p>
          <button className="label-md text-md-primary hover:text-md-primary_container transition-colors">START AUDIT</button>
        </div>
        <div className="bg-md-surface_container_low rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-md-surface_container_high flex items-center justify-center">
              <svg className="w-5 h-5 text-md-on_surface_variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            </div>
            <div><h3 className="headline-md text-md-on_surface">Recent Global Changes</h3><p className="body-sm text-md-on_surface_variant mt-0.5">Last administrative change was 4 hours ago by Julian Thorne.</p></div>
            <button className="ml-auto label-md text-md-primary hover:text-md-primary_container transition-colors whitespace-nowrap">View Logs</button>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 flex items-center justify-between text-xs text-md-on_surface_variant/50">
        <span>&copy; 2023 PIVO PARTNERS CRM &bull; ALL RIGHTS RESERVED</span>
        <div className="flex gap-4"><span>PRIVACY POLICY</span><span>SYSTEM STATUS</span></div>
      </div>

      {/* Create User Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User">
        <div className="space-y-4">
          <div><label className="block label-md text-md-on_surface_variant mb-2">Name</label><input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} placeholder="Full name" /></div>
          <div><label className="block label-md text-md-on_surface_variant mb-2">Email</label><input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className={inputClass} placeholder="user@example.com" /></div>
          <div><label className="block label-md text-md-on_surface_variant mb-2">Role</label><select value={formRole} onChange={(e) => setFormRole(e.target.value as "admin" | "client")} className={inputClass}><option value="client">Client</option><option value="admin">Admin</option></select></div>
          <div><label className="block label-md text-md-on_surface_variant mb-2">Password</label><input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className={inputClass} placeholder="At least 6 characters" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} disabled={saving} className="px-4 py-2.5 text-sm text-md-on_surface_variant hover:text-md-on_surface">Cancel</button>
            <button onClick={handleCreateUser} disabled={saving} className="px-5 py-2.5 text-sm rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity">{saving ? "Creating..." : "Create User"}</button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetUserId} onClose={() => { setResetUserId(null); setNewPassword(""); }} title="Reset Password">
        <div className="space-y-4">
          <p className="body-md text-md-on_surface_variant">Reset password for <span className="font-medium text-md-on_surface">{users.find((u) => u.user_id === resetUserId)?.name}</span></p>
          <div><label className="block label-md text-md-on_surface_variant mb-2">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="At least 6 characters" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setResetUserId(null); setNewPassword(""); }} disabled={saving} className="px-4 py-2.5 text-sm text-md-on_surface_variant hover:text-md-on_surface">Cancel</button>
            <button onClick={handleResetPassword} disabled={saving || newPassword.length < 6} className="px-5 py-2.5 text-sm rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity">{saving ? "Resetting..." : "Reset Password"}</button>
          </div>
        </div>
      </Modal>

      {/* Access Management Modal */}
      <Modal open={!!accessUserId} onClose={() => setAccessUserId(null)} title={`Project Access — ${accessUser?.name || ""}`} wide>
        <div className="space-y-4">
          {accessLoading ? (
            <div className="animate-pulse space-y-2"><div className="h-4 bg-md-surface_container_high rounded w-48"></div><div className="h-4 bg-md-surface_container_high rounded w-64"></div></div>
          ) : (
            <>
              {userAccess.length > 0 ? (
                <div>
                  <h4 className="label-md text-md-on_surface_variant mb-3">CURRENT ACCESS</h4>
                  <div className="space-y-2">
                    {userAccess.map((access) => {
                      const project = projects.find((p) => p.project_id === access.project_id);
                      return (
                        <div key={access.access_id} className="flex items-center justify-between bg-md-surface_container_low rounded-2xl px-4 py-3">
                          <div><p className="body-md font-medium text-md-on_surface">{project?.project_name || access.project_id}</p><span className={`label-sm text-[10px] px-2 py-0.5 rounded-lg font-medium ${access.permission_level === "edit" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{access.permission_level}</span></div>
                          <button onClick={() => handleRevokeAccess(access.access_id)} className="text-xs text-md-error hover:opacity-80 px-3 py-1.5 rounded-xl transition-colors">Revoke</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : <p className="body-md text-md-on_surface_variant italic">No project access granted yet.</p>}
              {availableProjects.length > 0 && (
                <div>
                  <h4 className="label-md text-md-on_surface_variant mb-3">GRANT ACCESS</h4>
                  <div className="space-y-2">
                    {availableProjects.map((project) => (
                      <div key={project.project_id} className="flex items-center justify-between bg-md-surface_container_lowest rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}>
                        <p className="body-md text-md-on_surface">{project.project_name}</p>
                        <div className="flex gap-1">
                          <button onClick={() => handleGrantAccess(project.project_id, "view")} className="text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-50 font-medium">View</button>
                          <button onClick={() => handleGrantAccess(project.project_id, "edit")} className="text-xs text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-emerald-50 font-medium">Edit</button>
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
