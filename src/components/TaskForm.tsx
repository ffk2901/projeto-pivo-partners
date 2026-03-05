"use client";

import { useState } from "react";
import type { TeamMember, Startup, Task } from "@/types";

interface TaskFormProps {
  team: TeamMember[];
  startups: Startup[];
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
}

export default function TaskForm({ team, startups, initial, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [startupId, setStartupId] = useState(initial?.startup_id || "");
  const [ownerId, setOwnerId] = useState(initial?.owner_id || "");
  const [dueDate, setDueDate] = useState(initial?.due_date || "");
  const [dueTime, setDueTime] = useState(initial?.due_time || "");
  const [status, setStatus] = useState<string>(initial?.status || "todo");
  const [priority, setPriority] = useState<string>(initial?.priority || "medium");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...initial,
        title,
        startup_id: startupId,
        owner_id: ownerId,
        due_date: dueDate,
        due_time: dueTime,
        status: status as Task["status"],
        priority: priority as Task["priority"],
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1">Title *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Startup</label>
          <select value={startupId} onChange={(e) => setStartupId(e.target.value)} className={inputClass}>
            <option value="">-- None --</option>
            {startups.map((s) => (
              <option key={s.startup_id} value={s.startup_id}>{s.startup_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Owner</label>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
            <option value="">-- Unassigned --</option>
            {team.map((m) => (
              <option key={m.team_id} value={m.team_id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Time</label>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="todo">To Do</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
        <button type="submit" disabled={submitting}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors font-medium">
          {submitting ? "Saving..." : initial?.task_id ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
