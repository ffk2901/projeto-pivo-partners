"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type {
  ProjectInvestor, Investor, TeamMember, ProjectNote, Task, Meeting, ActivityLogEntry,
  NoteType,
} from "@/types";
import {
  getFollowUpStatus, getStalledStatus, FOLLOW_UP_STATUS_CONFIG, NOTE_TYPE_LABELS,
} from "@/types";
import Modal from "./Modal";

type DrawerTab = "overview" | "meetings" | "tasks" | "notes" | "activity";

interface Props {
  open: boolean;
  onClose: () => void;
  link: ProjectInvestor;
  investor: Investor;
  projectId: string;
  stages: string[];
  team: TeamMember[];
  onRefresh: () => void;
  readOnly?: boolean;
  apiPrefix?: string;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const sizeClass = size === "lg" ? "w-10 h-10 text-sm" : size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[9px]";
  return (
    <div className={`${sizeClass} rounded-full bg-md-primary_container text-md-on_primary font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function Investor360Drawer({
  open, onClose, link, investor, projectId, stages, team, onRefresh, readOnly, apiPrefix,
}: Props) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    owner_id: "", priority: "" as ProjectInvestor["priority"],
    next_step: "", follow_up_date: "", latest_update: "",
    fit_summary: "", source: "", last_interaction_date: "",
    last_interaction_type: "", notes: "",
    origin: "" as Investor["origin"],
    wave: "" as ProjectInvestor["wave"],
  });

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("general_update");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteNextStep, setNoteNextStep] = useState("");
  const [noteFollowUpDate, setNoteFollowUpDate] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskOwner, setTaskOwner] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingParticipants, setMeetingParticipants] = useState("");

  const [saving, setSaving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const linkId = link.link_id;
  const investorId = link.investor_id;

  const loadInvestorData = useCallback(async () => {
    if (!open || !linkId) return;
    setLoading(true);
    try {
      const [n, t, m, a] = await Promise.all([
        api(apiPrefix).getProjectNotes(projectId, investorId),
        api(apiPrefix).getTasks(),
        api(apiPrefix).getMeetings(projectId, investorId),
        api(apiPrefix).getActivityLog(projectId, investorId),
      ]);
      setNotes(n);
      setTasks(t.filter((task) => task.project_id === projectId && task.investor_id === investorId));
      setMeetings(m);
      setActivity(a);
    } catch (err) {
      console.error("Failed to load investor data:", err);
    } finally {
      setLoading(false);
    }
  }, [open, linkId, investorId, projectId, apiPrefix]);

  useEffect(() => { loadInvestorData(); }, [loadInvestorData]);

  useEffect(() => {
    if (link) {
      setEditFields({
        owner_id: link.owner_id || "", priority: link.priority || "",
        next_step: link.next_step || link.next_action || "", follow_up_date: link.follow_up_date || "",
        latest_update: link.latest_update || "", fit_summary: link.fit_summary || "",
        source: link.source || "", last_interaction_date: link.last_interaction_date || "",
        last_interaction_type: link.last_interaction_type || "", notes: link.notes || "",
        origin: investor.origin || "", wave: link.wave || "",
      });
    }
  }, [link, investor.origin]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const followUpStatus = getFollowUpStatus(link);
  const isStalled = getStalledStatus(link);
  const statusConfig = FOLLOW_UP_STATUS_CONFIG[followUpStatus];
  const ownerName = team.find((m) => m.team_id === link.owner_id)?.name || link.owner_id || "Unassigned";
  const today = new Date().toISOString().split("T")[0];

  const handleSaveOverview = async () => {
    setSaving(true);
    try {
      const { origin, wave, ...piFields } = editFields;
      await api(apiPrefix).updateProjectInvestor({ link_id: link.link_id, ...piFields, wave, next_action: piFields.next_step });
      if (origin !== investor.origin) await api(apiPrefix).updateInvestor({ investor_id: investor.investor_id, origin });
      setEditMode(false);
      onRefresh();
    } catch (err) { console.error("Failed to save:", err); } finally { setSaving(false); }
  };

  const handleRemoveFromFunnel = async () => {
    setSaving(true);
    try { await api(apiPrefix).deleteProjectInvestor(link.link_id); setShowRemoveConfirm(false); onClose(); onRefresh(); }
    catch (err) { console.error("Failed to remove:", err); } finally { setSaving(false); }
  };

  const handleChangeStage = async (newStage: string) => {
    setSaving(true);
    try { await api(apiPrefix).updateProjectInvestor({ link_id: link.link_id, stage: newStage }); onRefresh(); }
    catch (err) { console.error("Failed to change stage:", err); } finally { setSaving(false); }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    try {
      await api(apiPrefix).createProjectNote({ project_id: projectId, investor_id: link.investor_id, title: noteTitle, content: noteContent, note_type: noteType, author_id: noteAuthor, next_step: noteNextStep, follow_up_date: noteFollowUpDate });
      setShowNoteForm(false); setNoteTitle(""); setNoteContent(""); setNoteNextStep(""); setNoteFollowUpDate("");
      loadInvestorData(); onRefresh();
    } catch (err) { console.error("Failed to add note:", err); } finally { setSaving(false); }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    setSaving(true);
    try {
      await api(apiPrefix).createTask({ project_id: projectId, investor_id: link.investor_id, startup_id: "", title: taskTitle, owner_id: taskOwner, due_date: taskDueDate, priority: taskPriority as Task["priority"] });
      setShowTaskForm(false); setTaskTitle(""); setTaskDueDate("");
      loadInvestorData(); onRefresh();
    } catch (err) { console.error("Failed to add task:", err); } finally { setSaving(false); }
  };

  const handleAddMeeting = async () => {
    if (!meetingTitle.trim() || !meetingDate) return;
    setSaving(true);
    try {
      await api(apiPrefix).createMeeting({ project_id: projectId, investor_id: link.investor_id, title: meetingTitle, date: meetingDate, time: meetingTime, participants: meetingParticipants });
      setShowMeetingForm(false); setMeetingTitle(""); setMeetingDate(""); setMeetingTime(""); setMeetingParticipants("");
      loadInvestorData(); onRefresh();
    } catch (err) { console.error("Failed to add meeting:", err); } finally { setSaving(false); }
  };

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try { await api(apiPrefix).updateTask({ task_id: task.task_id, status: newStatus }); loadInvestorData(); onRefresh(); }
    catch (err) { console.error("Failed to update task:", err); }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try { return new Date(iso.includes("T") ? iso : iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return iso; }
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  const upcomingMeetings = meetings.filter((m) => m.date >= today && m.status === "scheduled");
  const pastMeetings = meetings.filter((m) => m.date < today || m.status === "completed");

  const inputClass = "w-full rounded-2xl px-4 py-3 text-sm bg-md-surface_container_highest text-md-on_surface focus:outline-none focus:ring-2 focus:ring-md-primary_container/40 placeholder:text-md-on_surface_variant/50";
  const labelClass = "block label-md text-md-on_surface_variant mb-2";

  const TABS: { key: DrawerTab; label: string; count?: number }[] = [
    { key: "overview", label: "OVERVIEW" },
    { key: "meetings", label: "MEETINGS", count: meetings.length },
    { key: "tasks", label: "TASKS", count: tasks.length },
    { key: "notes", label: "NOTES", count: notes.length },
    { key: "activity", label: "ACTIVITY", count: activity.length },
  ];

  const openTasks = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-md-on_surface/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-md-surface_container_lowest shadow-ambient-lg flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-5 bg-md-surface_container_lowest flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="headline-lg text-md-on_surface truncate">{investor.investor_name}</h2>
              {/* Badges */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {investor.tags && investor.tags.split(";").filter(Boolean).slice(0, 1).map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 bg-md-secondary_container text-md-on_primary_container rounded-2xl font-medium">
                    {tag.trim().toUpperCase()}
                  </span>
                ))}
                {investor.origin && (
                  <span className="text-xs px-3 py-1 bg-md-surface_container_high text-md-on_surface rounded-2xl font-medium" style={{ border: "1px solid rgba(129, 117, 108, 0.3)" }}>
                    ORIGIN: {investor.origin === "br" ? "BRAZIL" : "INTERNATIONAL"}
                  </span>
                )}
                {link.wave && (
                  <span className="text-xs px-3 py-1 bg-md-surface_container_high text-md-on_surface_variant rounded-2xl font-medium" style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}>
                    WAVE {link.wave === "1" ? "I" : link.wave === "2" ? "II" : link.wave === "3" ? "III" : "IV"}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-md-on_surface_variant hover:text-md-on_surface hover:bg-md-surface_container_high transition-colors text-xl leading-none ml-3 flex-shrink-0"
            >
              &times;
            </button>
          </div>

          {/* Key info grid */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <span className="label-md text-md-on_surface_variant">CURRENT STAGE</span>
              {readOnly ? (
                <p className="mt-1 body-md font-medium text-md-on_surface">{link.stage}</p>
              ) : (
                <select
                  value={link.stage}
                  onChange={(e) => handleChangeStage(e.target.value)}
                  className="mt-1 w-full text-sm rounded-2xl px-3 py-2 text-md-on_surface bg-md-surface_container_lowest focus:outline-none focus:ring-2 focus:ring-md-primary_container/40"
                  style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}
                >
                  {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
            <div>
              <span className="label-md text-md-on_surface_variant">OWNER</span>
              <div className="flex items-center gap-2 mt-1">
                <Avatar name={ownerName} size="sm" />
                <p className="body-md font-medium text-md-on_surface truncate">{ownerName}</p>
              </div>
            </div>
            <div>
              <span className="label-md text-md-on_surface_variant">FOLLOW-UP DATE</span>
              <p className={`mt-1 body-md font-medium flex items-center gap-1.5 ${followUpStatus === "overdue" ? "text-md-error" : "text-md-on_surface"}`}>
                {followUpStatus === "overdue" && (
                  <svg className="w-4 h-4 text-md-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                )}
                {link.follow_up_date ? formatDate(link.follow_up_date) : "Not set"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {!readOnly && (
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => { setTab("overview"); setEditMode(true); }} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-2xl text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit
              </button>
              <button onClick={() => { setTab("notes"); setShowNoteForm(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-md-surface_container_high text-md-on_surface_variant hover:bg-md-surface_container_highest transition-colors" title="Add Note">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </button>
              <button onClick={() => { setTab("tasks"); setShowTaskForm(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-md-surface_container_high text-md-on_surface_variant hover:bg-md-surface_container_highest transition-colors" title="Add Task">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              </button>
              <button onClick={() => { setTab("meetings"); setShowMeetingForm(true); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-md-surface_container_high text-md-on_surface_variant hover:bg-md-surface_container_highest transition-colors" title="Add Meeting">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </button>
              <div className="flex-1" />
              <button onClick={() => setShowRemoveConfirm(true)} className="w-9 h-9 rounded-full flex items-center justify-center text-md-on_surface_variant hover:text-md-error hover:bg-md-error_container/20 transition-colors" title="Remove">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Tab nav */}
        <div className="flex px-6 flex-shrink-0 bg-md-surface_container_lowest gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 label-md text-[11px] border-b-2 -mb-px transition-colors ${
                tab === t.key ? "border-md-primary text-md-primary" : "border-transparent text-md-on_surface_variant hover:text-md-on_surface"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 text-[10px] opacity-50">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-md-surface_container_high rounded w-3/4"></div>
              <div className="h-4 bg-md-surface_container_high rounded w-1/2"></div>
              <div className="h-20 bg-md-surface_container_high rounded-2xl"></div>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {tab === "overview" && (
                <div className="space-y-5">
                  {editMode ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Owner</label><select value={editFields.owner_id} onChange={(e) => setEditFields({ ...editFields, owner_id: e.target.value })} className={inputClass}><option value="">Unassigned</option>{team.map((m) => <option key={m.team_id} value={m.team_id}>{m.name}</option>)}</select></div>
                        <div><label className={labelClass}>Priority</label><select value={editFields.priority} onChange={(e) => setEditFields({ ...editFields, priority: e.target.value as ProjectInvestor["priority"] })} className={inputClass}><option value="">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                      </div>
                      <div><label className={labelClass}>Next Step</label><input type="text" value={editFields.next_step} onChange={(e) => setEditFields({ ...editFields, next_step: e.target.value })} className={inputClass} placeholder="e.g. Send follow-up email" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Follow-up Date</label><input type="date" value={editFields.follow_up_date} onChange={(e) => setEditFields({ ...editFields, follow_up_date: e.target.value })} className={inputClass} /></div>
                        <div><label className={labelClass}>Last Interaction</label><input type="date" value={editFields.last_interaction_date} onChange={(e) => setEditFields({ ...editFields, last_interaction_date: e.target.value })} className={inputClass} /></div>
                      </div>
                      <div><label className={labelClass}>Interaction Type</label><select value={editFields.last_interaction_type} onChange={(e) => setEditFields({ ...editFields, last_interaction_type: e.target.value })} className={inputClass}><option value="">Select</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="message">Message</option><option value="other">Other</option></select></div>
                      <div><label className={labelClass}>Latest Update</label><textarea value={editFields.latest_update} onChange={(e) => setEditFields({ ...editFields, latest_update: e.target.value })} rows={2} className={inputClass} placeholder="Brief status update..." /></div>
                      <div><label className={labelClass}>Fit / Thesis</label><textarea value={editFields.fit_summary} onChange={(e) => setEditFields({ ...editFields, fit_summary: e.target.value })} rows={2} className={inputClass} /></div>
                      <div><label className={labelClass}>Source / Intro</label><input type="text" value={editFields.source} onChange={(e) => setEditFields({ ...editFields, source: e.target.value })} className={inputClass} placeholder="e.g. Referral from X" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Origin</label><select value={editFields.origin} onChange={(e) => setEditFields({ ...editFields, origin: e.target.value as Investor["origin"] })} className={inputClass}><option value="">Not set</option><option value="br">Brasileiro</option><option value="intl">Internacional</option></select></div>
                        <div><label className={labelClass}>Wave</label><select value={editFields.wave} onChange={(e) => setEditFields({ ...editFields, wave: e.target.value as ProjectInvestor["wave"] })} className={inputClass}><option value="">Not set</option><option value="1">1a Onda</option><option value="2">2a Onda</option><option value="3">3a Onda</option><option value="4">4a Onda</option></select></div>
                      </div>
                      <div><label className={labelClass}>Notes</label><textarea value={editFields.notes} onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })} rows={3} className={inputClass} /></div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setEditMode(false)} className="px-4 py-2 text-xs text-md-on_surface_variant hover:text-md-on_surface transition-colors">Cancel</button>
                        <button onClick={handleSaveOverview} disabled={saving} className="px-5 py-2 text-xs rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity">{saving ? "Saving..." : "Save"}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Investor Profile */}
                      <div>
                        <h3 className="label-md text-md-on_surface mb-4">INVESTOR PROFILE</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {investor.email && (
                            <div><p className="body-sm text-md-primary_container mb-1">Primary Email</p><p className="body-md text-md-on_surface">{investor.email}</p></div>
                          )}
                          {link.source && (
                            <div><p className="body-sm text-md-primary_container mb-1">Source</p><p className="body-md text-md-on_surface">{link.source}</p></div>
                          )}
                        </div>
                        {(link.fit_summary || link.latest_update) && (
                          <div className="mt-4">
                            <p className="body-sm text-md-primary_container mb-1">Bio</p>
                            <p className="body-md text-md-on_surface">{link.fit_summary || link.latest_update}</p>
                          </div>
                        )}
                      </div>

                      {/* Investment Parameters */}
                      <div>
                        <h3 className="label-md text-md-on_surface mb-4">INVESTMENT PARAMETERS</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-md-surface_container_high flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-md-on_surface_variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                              </svg>
                            </div>
                            <div className="flex-1"><p className="body-sm text-md-primary_container">Priority</p><p className="body-md text-md-on_surface font-medium">{link.priority || "Not set"}</p></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-md-surface_container_high flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-md-on_surface_variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                              </svg>
                            </div>
                            <div className="flex-1"><p className="body-sm text-md-primary_container">Next Step</p><p className="body-md text-md-on_surface font-medium">{link.next_step || link.next_action || "Not set"}</p></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-md-surface_container_high flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-md-on_surface_variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="body-sm text-md-primary_container">Last Interaction</p>
                              <p className="body-md text-md-on_surface font-medium">
                                {link.last_interaction_date
                                  ? `${formatDate(link.last_interaction_date)}${link.last_interaction_type ? ` (${link.last_interaction_type})` : ""}`
                                  : link.last_update ? formatDate(link.last_update) : "No interactions recorded"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {link.notes && (
                        <div>
                          <p className="body-sm text-md-primary_container mb-1">Notes</p>
                          <p className="body-md text-md-on_surface whitespace-pre-wrap">{link.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* MEETINGS TAB */}
              {tab === "meetings" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="headline-md text-md-on_surface">Meetings</h3>
                    {!readOnly && <button onClick={() => setShowMeetingForm(true)} className="px-4 py-2 text-xs rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity">+ Schedule</button>}
                  </div>
                  {showMeetingForm && (
                    <div className="bg-md-surface_container_low rounded-2xl p-4 space-y-3">
                      <input type="text" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className={inputClass} placeholder="Meeting title" />
                      <div className="grid grid-cols-2 gap-3"><input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className={inputClass} /><input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className={inputClass} /></div>
                      <input type="text" value={meetingParticipants} onChange={(e) => setMeetingParticipants(e.target.value)} className={inputClass} placeholder="Participants (semicolon-separated)" />
                      <div className="flex gap-2"><button onClick={() => setShowMeetingForm(false)} className="px-3 py-1.5 text-xs text-md-on_surface_variant">Cancel</button><button onClick={handleAddMeeting} disabled={saving} className="px-4 py-1.5 text-xs rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity">{saving ? "Saving..." : "Create"}</button></div>
                    </div>
                  )}
                  {upcomingMeetings.length > 0 && <div><p className="label-md text-md-on_surface_variant mb-2">UPCOMING</p>{upcomingMeetings.map((m) => <MeetingCard key={m.meeting_id} meeting={m} formatDate={formatDate} />)}</div>}
                  {pastMeetings.length > 0 && <div><p className="label-md text-md-on_surface_variant mb-2">PAST</p>{pastMeetings.map((m) => <MeetingCard key={m.meeting_id} meeting={m} formatDate={formatDate} />)}</div>}
                  {meetings.length === 0 && !showMeetingForm && <p className="body-sm text-md-on_surface_variant italic text-center py-6">No meetings recorded yet</p>}
                </div>
              )}

              {/* TASKS TAB */}
              {tab === "tasks" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="headline-md text-md-on_surface">Tasks</h3>
                    {!readOnly && <button onClick={() => setShowTaskForm(true)} className="px-4 py-2 text-xs rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity">+ Add Task</button>}
                  </div>
                  {showTaskForm && (
                    <div className="bg-md-surface_container_low rounded-2xl p-4 space-y-3">
                      <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={inputClass} placeholder="Task title" />
                      <div className="grid grid-cols-2 gap-3"><select value={taskOwner} onChange={(e) => setTaskOwner(e.target.value)} className={inputClass}><option value="">Assignee</option>{team.map((m) => <option key={m.team_id} value={m.team_id}>{m.name}</option>)}</select><input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className={inputClass} /></div>
                      <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className={inputClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                      <div className="flex gap-2"><button onClick={() => setShowTaskForm(false)} className="px-3 py-1.5 text-xs text-md-on_surface_variant">Cancel</button><button onClick={handleAddTask} disabled={saving} className="px-4 py-1.5 text-xs rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity">{saving ? "Saving..." : "Create"}</button></div>
                    </div>
                  )}
                  {tasks.length > 0 ? (
                    <div className="space-y-2">
                      {tasks.sort((a, b) => { if (a.status === "done" && b.status !== "done") return 1; if (a.status !== "done" && b.status === "done") return -1; return (a.due_date || "9").localeCompare(b.due_date || "9"); }).map((task) => {
                        const taskOwnerName = team.find((m) => m.team_id === task.owner_id);
                        const isOverdue = task.due_date && task.due_date < today && task.status !== "done";
                        return (
                          <div key={task.task_id} className={`flex items-start gap-3 p-3 rounded-2xl transition-colors ${task.status === "done" ? "bg-md-surface_container_low opacity-60" : "bg-md-surface_container_lowest"}`}>
                            <button onClick={() => handleToggleTask(task)} className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${task.status === "done" ? "bg-emerald-500 text-white" : "bg-md-surface_container_highest hover:bg-md-primary_container/20"}`} style={task.status !== "done" ? { border: "2px solid rgba(211, 196, 185, 0.4)" } : undefined}>
                              {task.status === "done" && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`body-md font-medium ${task.status === "done" ? "line-through text-md-on_surface_variant" : "text-md-on_surface"}`}>{task.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-md-on_surface_variant">
                                {taskOwnerName && <span>{taskOwnerName.name}</span>}
                                {task.due_date && <span className={isOverdue ? "text-md-error font-medium" : ""}>{formatDate(task.due_date)}</span>}
                                {task.priority !== "medium" && <span className={task.priority === "high" ? "text-md-error" : "text-md-on_surface_variant/50"}>{task.priority}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !showTaskForm && <p className="body-sm text-md-on_surface_variant italic text-center py-6">No tasks yet</p>}
                </div>
              )}

              {/* NOTES TAB */}
              {tab === "notes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="headline-md text-md-on_surface">Notes</h3>
                    {!readOnly && <button onClick={() => setShowNoteForm(true)} className="px-4 py-2 text-xs rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity">+ Add Note</button>}
                  </div>
                  {showNoteForm && (
                    <div className="bg-md-surface_container_low rounded-2xl p-4 space-y-3">
                      <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className={inputClass} placeholder="Note title (optional)" />
                      <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={4} className={inputClass} placeholder="Write your note..." />
                      <div className="grid grid-cols-2 gap-3"><select value={noteType} onChange={(e) => setNoteType(e.target.value as NoteType)} className={inputClass}>{Object.entries(NOTE_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}</select><select value={noteAuthor} onChange={(e) => setNoteAuthor(e.target.value)} className={inputClass}><option value="">Author</option>{team.map((m) => <option key={m.team_id} value={m.team_id}>{m.name}</option>)}</select></div>
                      <input type="text" value={noteNextStep} onChange={(e) => setNoteNextStep(e.target.value)} className={inputClass} placeholder="Next step (optional)" />
                      <div><label className="text-[10px] text-md-on_surface_variant">Follow-up date</label><input type="date" value={noteFollowUpDate} onChange={(e) => setNoteFollowUpDate(e.target.value)} className={inputClass} /></div>
                      <div className="flex gap-2"><button onClick={() => setShowNoteForm(false)} className="px-3 py-1.5 text-xs text-md-on_surface_variant">Cancel</button><button onClick={handleAddNote} disabled={saving} className="px-4 py-1.5 text-xs rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity">{saving ? "Saving..." : "Create"}</button></div>
                    </div>
                  )}
                  {notes.length > 0 ? (
                    <div className="space-y-3">
                      {notes.map((note) => {
                        const author = team.find((m) => m.team_id === note.author_id);
                        return (
                          <div key={note.note_id} className="bg-md-surface_container_lowest rounded-2xl p-4">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                {note.title && <p className="body-md font-semibold text-md-on_surface">{note.title}</p>}
                                <div className="flex items-center gap-1.5 text-[10px] text-md-on_surface_variant mt-0.5">
                                  {note.note_type && <span className="px-2 py-0.5 bg-md-surface_container_high text-md-on_surface_variant rounded-lg font-medium">{NOTE_TYPE_LABELS[note.note_type] || note.note_type}</span>}
                                  {author && <span>{author.name}</span>}
                                  <span>{formatDateTime(note.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <p className="body-sm text-md-on_surface_variant whitespace-pre-wrap mt-2 leading-relaxed">{note.content}</p>
                            {note.next_step && <p className="text-[10px] text-md-primary mt-2">Next: {note.next_step}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : !showNoteForm && <p className="body-sm text-md-on_surface_variant italic text-center py-6">No notes yet</p>}
                </div>
              )}

              {/* ACTIVITY TAB */}
              {tab === "activity" && (
                <div className="space-y-1">
                  <h3 className="headline-md text-md-on_surface mb-3">Activity Timeline</h3>
                  {activity.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-md-outline_variant/30" />
                      {activity.map((entry) => {
                        const iconColors: Record<string, string> = {
                          investor_added: "bg-emerald-500", stage_change: "bg-blue-500", note_created: "bg-amber-500",
                          task_created: "bg-violet-500", task_completed: "bg-emerald-600", meeting_scheduled: "bg-cyan-500", meeting_completed: "bg-cyan-700",
                        };
                        return (
                          <div key={entry.activity_id} className="flex gap-3 py-2.5 relative">
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${iconColors[entry.activity_type] || "bg-md-primary_container"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="body-sm text-md-on_surface">{entry.description}</p>
                              <p className="text-[10px] text-md-on_surface_variant mt-0.5">{formatDateTime(entry.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="body-sm text-md-on_surface_variant italic text-center py-6">No activity recorded yet</p>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky bottom summary bar */}
        <div className="flex-shrink-0 bg-md-surface_container_low px-6 py-3 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="label-sm text-md-on_surface_variant">MEETINGS</p>
            <p className="headline-md text-md-on_surface">{meetings.length}</p>
          </div>
          <div className="text-center">
            <p className="label-sm text-md-on_surface_variant">OPEN TASKS</p>
            <p className="headline-md text-md-on_surface">{openTasks}</p>
          </div>
          <div className="text-center">
            <p className="label-sm text-md-on_surface_variant">COMMITMENT</p>
            <p className="headline-md text-md-primary_container">$2.5M</p>
          </div>
        </div>
      </div>

      {/* Remove confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-md-on_surface/40 backdrop-blur-sm" onClick={() => setShowRemoveConfirm(false)}>
          <div className="bg-md-surface_container_lowest rounded-2xl shadow-ambient-lg w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="headline-md text-md-on_surface mb-2">Remove from funnel?</h3>
            <p className="body-md text-md-on_surface_variant mb-4">
              <span className="font-medium text-md-on_surface">{investor.investor_name}</span> will be removed from this funnel. The investor will still exist in the directory.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRemoveConfirm(false)} disabled={saving} className="px-4 py-2.5 text-sm text-md-on_surface_variant hover:text-md-on_surface transition-colors">Cancel</button>
              <button onClick={handleRemoveFromFunnel} disabled={saving} className="px-5 py-2.5 text-sm bg-md-error text-md-on_primary rounded-2xl hover:opacity-90 disabled:opacity-50 transition-opacity font-medium">{saving ? "Removing..." : "Remove"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MeetingCard({ meeting, formatDate }: { meeting: Meeting; formatDate: (d: string) => string }) {
  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-md-surface_container_high text-md-on_surface_variant",
  };
  return (
    <div className="bg-md-surface_container_lowest rounded-2xl p-4 mb-2">
      <div className="flex items-start justify-between">
        <p className="body-md font-semibold text-md-on_surface">{meeting.title}</p>
        <span className={`label-sm text-[10px] px-2 py-0.5 rounded-lg font-medium ${statusColors[meeting.status] || statusColors.scheduled}`}>{meeting.status}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-md-on_surface_variant mt-1">
        <span>{formatDate(meeting.date)}</span>
        {meeting.time && <span>{meeting.time}</span>}
        {meeting.source === "calendar" && <span className="text-md-primary_container">synced</span>}
      </div>
      {meeting.participants && <p className="text-xs text-md-on_surface_variant mt-1">Participants: {meeting.participants.replace(/;/g, ", ")}</p>}
      {meeting.summary && <p className="body-sm text-md-on_surface mt-2 whitespace-pre-wrap">{meeting.summary}</p>}
      {meeting.next_steps && <p className="text-[10px] text-md-primary mt-1">Next steps: {meeting.next_steps}</p>}
    </div>
  );
}
