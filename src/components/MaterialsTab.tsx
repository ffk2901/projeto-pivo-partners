"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Startup } from "@/types";

interface Props {
  startup: Startup;
  onRefresh: () => void;
  readOnly?: boolean;
  apiPrefix?: string;
}

const MATERIALS = [
  { key: "pitch_deck_url", label: "Pitch Deck" },
  { key: "data_room_url", label: "Data Room" },
  { key: "pl_url", label: "P&L" },
  { key: "investment_memo_url", label: "Investment Memo" },
] as const;

type MaterialKey = (typeof MATERIALS)[number]["key"];

export default function MaterialsTab({ startup, onRefresh, readOnly, apiPrefix }: Props) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<MaterialKey, string>>({
    pitch_deck_url: startup.pitch_deck_url,
    data_room_url: startup.data_room_url,
    pl_url: startup.pl_url,
    investment_memo_url: startup.investment_memo_url,
  });
  const [notes, setNotes] = useState(startup.notes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api(apiPrefix).updateStartup({ startup_id: startup.startup_id, ...values, notes });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">
          {Object.values(values).filter(Boolean).length}/4 materials linked
        </p>
        {!editing && !readOnly && (
          <button onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-colors font-medium">
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        {MATERIALS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-ink-700 mb-1">{label}</label>
            {editing ? (
              <input type="url" value={values[key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="https://..." className={inputClass} />
            ) : values[key] ? (
              <a href={values[key]} target="_blank" rel="noopener noreferrer"
                className="text-sm text-brand-500 hover:text-brand-700 break-all transition-colors">
                {values[key]}
              </a>
            ) : (
              <p className="text-sm text-ink-300 italic">Not set</p>
            )}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Notes</label>
          {editing ? (
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          ) : notes ? (
            <p className="text-sm text-ink-700 whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-sm text-ink-300 italic">No notes</p>
          )}
        </div>

        {editing && (
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => {
              setValues({ pitch_deck_url: startup.pitch_deck_url, data_room_url: startup.data_room_url, pl_url: startup.pl_url, investment_memo_url: startup.investment_memo_url });
              setNotes(startup.notes);
              setEditing(false);
            }} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors font-medium">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
