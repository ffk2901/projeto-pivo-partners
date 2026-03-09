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
}

export default function Investor360Drawer({
  open, onClose, link, investor, projectId, stages, team, onRefresh,
}: Props) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit states for overview
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    owner_id: "", priority: "" as ProjectInvestor["priority"],
    next_step: "", follow_up_date: "", latest_update: "",
    fit_summary: "", source: "", last_interaction_date: "",
    last_interaction_type: "", notes: "",
  });

  // Note form
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("general_update");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteNextStep, setNoteNextStep] = useState("");
  const [noteFollowUpDate, setNoteFollowUpDate] = useState("");

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskOwner, setTaskOwner] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");

  // Meeting form
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
        api().getProjectNotes(projectId, investorId),
        api().getTasks(),
        api().getMeetings(projectId, investorId),
        api().getActivityLog(projectId, investorId),
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
  }, [open, linkId, investorId, projectId]);

  useEffect(() => {
    loadInvestorData();
  }, [loadInvestorData]);

  useEffect(() => {
    if (link) {
      setEditFields({
        owner_id: link.owner_id || "",
        priority: link.priority || "",
        next_step: link.next_step || link.next_action || "",
        follow_up_date: link.follow_up_date || "",
        latest_update: link.latest_update || "",
        fit_summary: link.fit_summary || "",
        source: link.source || "",
        last_interaction_date: link.last_interaction_date || "",
        last_interaction_type: link.last_interaction_type || "",
        notes: link.notes || "",
      });
    }
  }, [link]);

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
      await api().updateProjectInvestor({
        link_id: link.link_id,
        ...editFields,
        next_action: editFields.next_step,
      });
      setEditMode(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromFunnel = async () => {
    setSaving(true);
    try {
      await api().deleteProjectInvestor(link.link_id);
      setShowRemoveConfirm(false);
      onClose();
      onRefresh();
    } catch (err) {
      console.error("Failed to remove:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStage = async (newStage: string) => {
    setSaving(true);
    try {
      await api().updateProjectInvestor({ link_id: link.link_id, stage: newStage });
      onRefresh();
    } catch (err) {
      console.error("Failed to change stage:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    try {
      await api().createProjectNote({
        project_id: projectId,
        investor_id: link.investor_id,
        title: noteTitle,
        content: noteContent,
        note_type: noteType,
        author_id: noteAuthor,
        next_step: noteNextStep,
        follow_up_date: noteFollowUpDate,
      });
      setShowNoteForm(false);
      setNoteTitle(""); setNoteContent(""); setNoteNextStep(""); setNoteFollowUpDate("");
      loadInvestorData();
      onRefresh();
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    setSaving(true);
    try {
      await api().createTask({
        project_id: projectId,
        investor_id: link.investor_id,
        startup_id: "",
        title: taskTitle,
        owner_id: taskOwner,
        due_date: taskDueDate,
        priority: taskPriority as Task["priority"],
      });
      setShowTaskForm(false);
      setTaskTitle(""); setTaskDueDate("");
      loadInvestorData();
      onRefresh();
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeeting = async () => {
    if (!meetingTitle.trim() || !meetingDate) return;
    setSaving(true);
    try {
      await api().createMeeting({
        project_id: projectId,
        investor_id: link.investor_id,
        title: meetingTitle,
        date: meetingDate,
        time: meetingTime,
        participants: meetingParticipants,
      });
      setShowMeetingForm(false);
      setMeetingTitle(""); setMeetingDate(""); setMeetingTime(""); setMeetingParticipants("");
      loadInvestorData();
      onRefresh();
    } catch (err) {
      console.error("Failed to add meeting:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      await api().updateTask({ task_id: task.task_id, status: newStatus });
      loadInvestorData();
      onRefresh();
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return iso; }
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  const upcomingMeetings = meetings.filter((m) => m.date >= today && m.status === "scheduled");
  const pastMeetings = meetings.filter((m) => m.date < today || m.status === "completed");

  const inputClass = "w-full border border-brand-200 rounded-xl px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40";
  const labelClass = "block text-xs text-ink-400 uppercase tracking-wide mb-1";

  const TABS: { key: DrawerTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "meetings", label: "Meetings", count: meetings.length },
    { key: "tasks", label: "Tasks", count: tasks.length },
    { key: "notes", label: "Notes", count: notes.length },
    { key: "activity", label: "Timeline", count: activity.length },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-brand-900/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-surface-0 border-l border-brand-200/60 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Sticky Header */}
        <div className="px-5 py-4 border-b border-brand-200/40 bg-surface-50 flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink-800 truncate">{investor.investor_name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {investor.tags && investor.tags.split(";").filter(Boolean).slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium">
                    {tag.trim()}
                  </span>
                ))}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                  {isStalled ? "Stalled" : statusConfig.label}
                </span>
                {link.priority && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    link.priority === "high" ? "bg-red-100 text-red-700" :
                    link.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"
                  }`}>
                    {link.priority}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-brand-100 transition-colors text-lg leading-none ml-2 flex-shrink-0"
            >
              &times;
            </button>
          </div>

          {/* Key info row */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-ink-400">Stage</span>
              <select
                value={link.stage}
                onChange={(e) => handleChangeStage(e.target.value)}
                className="mt-0.5 w-full text-xs border border-brand-200 rounded-lg px-1.5 py-1 text-ink-700 bg-surface-0 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
              >
                {stages.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span className="text-ink-400">Owner</span>
              <p className="mt-0.5 text-ink-700 font-medium truncate">{ownerName}</p>
            </div>
            <div>
              <span className="text-ink-400">Follow-up</span>
              <p className="mt-0.5 text-ink-700 font-medium">{link.follow_up_date ? formatDate(link.follow_up_date) : "Not set"}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <button onClick={() => { setTab("overview"); setEditMode(true); }} className="px-2.5 py-1 text-[10px] font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">Edit</button>
            <button onClick={() => { setTab("notes"); setShowNoteForm(true); }} className="px-2.5 py-1 text-[10px] font-medium bg-surface-0 text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">+ Note</button>
            <button onClick={() => { setTab("tasks"); setShowTaskForm(true); }} className="px-2.5 py-1 text-[10px] font-medium bg-surface-0 text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">+ Task</button>
            <button onClick={() => { setTab("meetings"); setShowMeetingForm(true); }} className="px-2.5 py-1 text-[10px] font-medium bg-surface-0 text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">+ Meeting</button>
            <button onClick={() => setShowRemoveConfirm(true)} className="px-2.5 py-1 text-[10px] font-medium bg-surface-0 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors ml-auto">Remove</button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-brand-200/40 px-5 flex-shrink-0 bg-surface-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-400 hover:text-ink-700"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 text-[10px] text-ink-300">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-brand-200/40 rounded w-3/4"></div>
              <div className="h-4 bg-brand-200/40 rounded w-1/2"></div>
              <div className="h-20 bg-brand-200/40 rounded"></div>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {tab === "overview" && (
                <div className="space-y-4">
                  {editMode ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Owner</label>
                          <select value={editFields.owner_id} onChange={(e) => setEditFields({ ...editFields, owner_id: e.target.value })} className={inputClass}>
                            <option value="">Unassigned</option>
                            {team.map((m) => <option key={m.team_id} value={m.team_id}>{m.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Priority</label>
                          <select value={editFields.priority} onChange={(e) => setEditFields({ ...editFields, priority: e.target.value as ProjectInvestor["priority"] })} className={inputClass}>
                            <option value="">None</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Next Step</label>
                        <input type="text" value={editFields.next_step} onChange={(e) => setEditFields({ ...editFields, next_step: e.target.value })} className={inputClass} placeholder="e.g. Send follow-up email" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Follow-up Date</label>
                          <input type="date" value={editFields.follow_up_date} onChange={(e) => setEditFields({ ...editFields, follow_up_date: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Last Interaction Date</label>
                          <input type="date" value={editFields.last_interaction_date} onChange={(e) => setEditFields({ ...editFields, last_interaction_date: e.target.value })} className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Last Interaction Type</label>
                        <select value={editFields.last_interaction_type} onChange={(e) => setEditFields({ ...editFields, last_interaction_type: e.target.value })} className={inputClass}>
                          <option value="">Select</option>
                          <option value="email">Email</option>
                          <option value="call">Call</option>
                          <option value="meeting">Meeting</option>
                          <option value="message">Message</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Latest Update</label>
                        <textarea value={editFields.latest_update} onChange={(e) => setEditFields({ ...editFields, latest_update: e.target.value })} rows={2} className={inputClass} placeholder="Brief status update..." />
                      </div>
                      <div>
                        <label className={labelClass}>Fit / Thesis Summary</label>
                        <textarea value={editFields.fit_summary} onChange={(e) => setEditFields({ ...editFields, fit_summary: e.target.value })} rows={2} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Source / Intro</label>
                        <input type="text" value={editFields.source} onChange={(e) => setEditFields({ ...editFields, source: e.target.value })} className={inputClass} placeholder="e.g. Referral from X" />
                      </div>
                      <div>
                        <label className={labelClass}>Notes</label>
                        <textarea value={editFields.notes} onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })} rows={3} className={inputClass} />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-700">Cancel</button>
                        <button onClick={handleSaveOverview} disabled={saving} className="px-4 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium">
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <OverviewField label="Stage" value={link.stage} />
                      <OverviewField label="Owner" value={ownerName} />
                      <OverviewField label="Priority" value={link.priority || "Not set"} />
                      <OverviewField label="Next Step" value={link.next_step || link.next_action || "Not set"} />
                      <OverviewField label="Follow-up Date" value={link.follow_up_date ? formatDate(link.follow_up_date) : "Not set"} />
                      <OverviewField label="Follow-up Status" value={isStalled ? "Stalled" : statusConfig.label} badge badgeClass={`${statusConfig.bg} ${statusConfig.color}`} />
                      <OverviewField label="Last Interaction" value={
                        link.last_interaction_date
                          ? `${formatDate(link.last_interaction_date)}${link.last_interaction_type ? ` (${link.last_interaction_type})` : ""}`
                          : link.last_update ? formatDate(link.last_update) : "No interactions recorded"
                      } />
                      {link.latest_update && <OverviewField label="Latest Update" value={link.latest_update} />}
                      {link.fit_summary && <OverviewField label="Fit / Thesis" value={link.fit_summary} />}
                      {link.source && <OverviewField label="Source" value={link.source} />}
                      {link.notes && <OverviewField label="Notes" value={link.notes} />}
                      {investor.email && <OverviewField label="Contact Email" value={investor.email} />}
                      {investor.linkedin && <OverviewField label="LinkedIn" value={investor.linkedin} />}

                      {/* Quick summary stats */}
                      <div className="pt-3 border-t border-brand-200/40">
                        <div className="grid grid-cols-3 gap-3">
                          <SummaryWidget label="Tasks" value={tasks.length} sub={`${tasks.filter((t) => t.status !== "done").length} open`} />
                          <SummaryWidget label="Notes" value={notes.length} />
                          <SummaryWidget label="Meetings" value={meetings.length} sub={`${upcomingMeetings.length} upcoming`} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MEETINGS TAB */}
              {tab === "meetings" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink-700">Meetings</h3>
                    <button
                      onClick={() => setShowMeetingForm(true)}
                      className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
                    >
                      + Schedule
                    </button>
                  </div>

                  {showMeetingForm && (
                    <div className="bg-surface-50 border border-brand-200/60 rounded-xl p-3 space-y-2">
                      <input type="text" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className={inputClass} placeholder="Meeting title" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className={inputClass} />
                        <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className={inputClass} />
                      </div>
                      <input type="text" value={meetingParticipants} onChange={(e) => setMeetingParticipants(e.target.value)} className={inputClass} placeholder="Participants (semicolon-separated)" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowMeetingForm(false)} className="px-3 py-1.5 text-xs text-ink-500">Cancel</button>
                        <button onClick={handleAddMeeting} disabled={saving} className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium disabled:opacity-50">
                          {saving ? "Saving..." : "Create"}
                        </button>
                      </div>
                    </div>
                  )}

                  {upcomingMeetings.length > 0 && (
                    <div>
                      <p className="text-xs text-ink-400 uppercase tracking-wide mb-2">Upcoming</p>
                      {upcomingMeetings.map((m) => (
                        <MeetingCard key={m.meeting_id} meeting={m} formatDate={formatDate} />
                      ))}
                    </div>
                  )}

                  {pastMeetings.length > 0 && (
                    <div>
                      <p className="text-xs text-ink-400 uppercase tracking-wide mb-2">Past</p>
                      {pastMeetings.map((m) => (
                        <MeetingCard key={m.meeting_id} meeting={m} formatDate={formatDate} />
                      ))}
                    </div>
                  )}

                  {meetings.length === 0 && !showMeetingForm && (
                    <p className="text-xs text-ink-400 italic text-center py-6">No meetings recorded yet</p>
                  )}
                </div>
              )}

              {/* TASKS TAB */}
              {tab === "tasks" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink-700">Tasks</h3>
                    <button
                      onClick={() => setShowTaskForm(true)}
                      className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
                    >
                      + Add Task
                    </button>
                  </div>

                  {showTaskForm && (
                    <div className="bg-surface-50 border border-brand-200/60 rounded-xl p-3 space-y-2">
                      <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={inputClass} placeholder="Task title" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={taskOwner} onChange={(e) => setTaskOwner(e.target.value)} className={inputClass}>
                          <option value="">Assignee</option>
                          {team.map((m) => <option key={m.team_id} value={m.team_id}>{m.name}</option>)}
                        </select>
                        <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className={inputClass} />
                      </div>
                      <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className={inputClass}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => setShowTaskForm(false)} className="px-3 py-1.5 text-xs text-ink-500">Cancel</button>
                        <button onClick={handleAddTask} disabled={saving} className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium disabled:opacity-50">
                          {saving ? "Saving..." : "Create"}
                        </button>
                      </div>
                    </div>
                  )}

                  {tasks.length > 0 ? (
                    <div className="space-y-2">
                      {tasks.sort((a, b) => {
                        if (a.status === "done" && b.status !== "done") return 1;
                        if (a.status !== "done" && b.status === "done") return -1;
                        return (a.due_date || "9").localeCompare(b.due_date || "9");
                      }).map((task) => {
                        const owner = team.find((m) => m.team_id === task.owner_id);
                        const isOverdue = task.due_date && task.due_date < today && task.status !== "done";
                        return (
                          <div key={task.task_id} className={`flex items-start gap-2 p-2.5 rounded-xl border transition-colors ${
                            task.status === "done" ? "bg-surface-50 border-brand-200/30 opacity-60" : "bg-surface-0 border-brand-200/60"
                          }`}>
                            <button
                              onClick={() => handleToggleTask(task)}
                              className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                task.status === "done" ? "bg-emerald-500 border-emerald-500 text-white" : "border-brand-300 hover:border-brand-500"
                              }`}
                            >
                              {task.status === "done" && <span className="text-[8px]">&#10003;</span>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${task.status === "done" ? "line-through text-ink-400" : "text-ink-700"}`}>{task.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink-400">
                                {owner && <span>{owner.name}</span>}
                                {task.due_date && (
                                  <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                    {formatDate(task.due_date)}
                                  </span>
                                )}
                                {task.priority !== "medium" && (
                                  <span className={task.priority === "high" ? "text-red-500" : "text-ink-300"}>{task.priority}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !showTaskForm && (
                    <p className="text-xs text-ink-400 italic text-center py-6">No tasks yet</p>
                  )}
                </div>
              )}

              {/* NOTES TAB */}
              {tab === "notes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink-700">Notes</h3>
                    <button
                      onClick={() => setShowNoteForm(true)}
                      className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
                    >
                      + Add Note
                    </button>
                  </div>

                  {showNoteForm && (
                    <div className="bg-surface-50 border border-brand-200/60 rounded-xl p-3 space-y-2">
                      <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className={inputClass} placeholder="Note title (optional)" />
                      <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={4} className={inputClass} placeholder="Write your note..." />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={noteType} onChange={(e) => setNoteType(e.target.value as NoteType)} className={inputClass}>
                          {Object.entries(NOTE_TYPE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                        <select value={noteAuthor} onChange={(e) => setNoteAuthor(e.target.value)} className={inputClass}>
                          <option value="">Author</option>
                          {team.map((m) => <option key={m.team_id} value={m.team_id}>{m.name}</option>)}
                        </select>
                      </div>
                      <input type="text" value={noteNextStep} onChange={(e) => setNoteNextStep(e.target.value)} className={inputClass} placeholder="Next step (optional)" />
                      <div>
                        <label className="text-[10px] text-ink-400">Follow-up date</label>
                        <input type="date" value={noteFollowUpDate} onChange={(e) => setNoteFollowUpDate(e.target.value)} className={inputClass} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowNoteForm(false)} className="px-3 py-1.5 text-xs text-ink-500">Cancel</button>
                        <button onClick={handleAddNote} disabled={saving} className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium disabled:opacity-50">
                          {saving ? "Saving..." : "Create"}
                        </button>
                      </div>
                    </div>
                  )}

                  {notes.length > 0 ? (
                    <div className="space-y-2">
                      {notes.map((note) => {
                        const author = team.find((m) => m.team_id === note.author_id);
                        return (
                          <div key={note.note_id} className="bg-surface-0 border border-brand-200/60 rounded-xl p-3">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                {note.title && <p className="text-xs font-semibold text-ink-700">{note.title}</p>}
                                <div className="flex items-center gap-1.5 text-[10px] text-ink-400 mt-0.5">
                                  {note.note_type && (
                                    <span className="px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium">
                                      {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                                    </span>
                                  )}
                                  {author && <span>{author.name}</span>}
                                  <span>{formatDateTime(note.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-ink-600 whitespace-pre-wrap mt-1.5 leading-relaxed">{note.content}</p>
                            {note.next_step && (
                              <p className="text-[10px] text-brand-500 mt-1.5">Next: {note.next_step}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : !showNoteForm && (
                    <p className="text-xs text-ink-400 italic text-center py-6">No notes yet</p>
                  )}
                </div>
              )}

              {/* ACTIVITY / TIMELINE TAB */}
              {tab === "activity" && (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-ink-700 mb-3">Activity Timeline</h3>
                  {activity.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-brand-200/60" />
                      {activity.map((entry) => {
                        const iconColors: Record<string, string> = {
                          investor_added: "bg-emerald-500",
                          stage_change: "bg-blue-500",
                          note_created: "bg-amber-500",
                          task_created: "bg-purple-500",
                          task_completed: "bg-emerald-600",
                          meeting_scheduled: "bg-cyan-500",
                          meeting_completed: "bg-cyan-700",
                        };
                        return (
                          <div key={entry.activity_id} className="flex gap-3 py-2 relative">
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${iconColors[entry.activity_type] || "bg-brand-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-ink-700">{entry.description}</p>
                              <p className="text-[10px] text-ink-400 mt-0.5">{formatDateTime(entry.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-400 italic text-center py-6">No activity recorded yet</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Remove confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-900/40 backdrop-blur-sm" onClick={() => setShowRemoveConfirm(false)}>
          <div className="bg-surface-0 rounded-2xl shadow-xl border border-brand-200/60 w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-ink-800 mb-2">Remove from funnel?</h3>
            <p className="text-sm text-ink-500 mb-4">
              <span className="font-medium text-ink-700">{investor.investor_name}</span> will be removed from this funnel. The investor will still exist in the directory.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRemoveConfirm(false)} disabled={saving} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
              <button onClick={handleRemoveFromFunnel} disabled={saving} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors font-medium">
                {saving ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OverviewField({ label, value, badge, badgeClass }: { label: string; value: string; badge?: boolean; badgeClass?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-ink-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      {badge ? (
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${badgeClass || ""}`}>{value}</span>
      ) : (
        <span className="text-xs text-ink-700 flex-1">{value}</span>
      )}
    </div>
  );
}

function SummaryWidget({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-surface-50 border border-brand-200/40 rounded-xl p-2.5 text-center">
      <p className="text-lg font-bold text-ink-700">{value}</p>
      <p className="text-[10px] text-ink-400 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-ink-300">{sub}</p>}
    </div>
  );
}

function MeetingCard({ meeting, formatDate }: { meeting: Meeting; formatDate: (d: string) => string }) {
  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-ink-100 text-ink-500",
  };
  return (
    <div className="bg-surface-0 border border-brand-200/60 rounded-xl p-3 mb-2">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-ink-700">{meeting.title}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${statusColors[meeting.status] || statusColors.scheduled}`}>
          {meeting.status}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-ink-400 mt-1">
        <span>{formatDate(meeting.date)}</span>
        {meeting.time && <span>{meeting.time}</span>}
        {meeting.source === "calendar" && <span className="text-brand-500">synced</span>}
      </div>
      {meeting.participants && (
        <p className="text-[10px] text-ink-400 mt-1">Participants: {meeting.participants.replace(/;/g, ", ")}</p>
      )}
      {meeting.summary && (
        <p className="text-xs text-ink-600 mt-2 whitespace-pre-wrap">{meeting.summary}</p>
      )}
      {meeting.next_steps && (
        <p className="text-[10px] text-brand-500 mt-1">Next steps: {meeting.next_steps}</p>
      )}
    </div>
  );
}
