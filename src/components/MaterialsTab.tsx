"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Startup } from "@/types";

interface Props {
  startup: Startup;
  onRefresh: () => void;
}

const MATERIALS = [
  { key: "pitch_deck_url", label: "Pitch Deck" },
  { key: "data_room_url", label: "Data Room" },
  { key: "pl_url", label: "P&L" },
  { key: "investment_memo_url", label: "Investment Memo" },
] as const;

type MaterialKey = (typeof MATERIALS)[number]["key"];

export default function MaterialsTab({ startup, onRefresh }: Props) {
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
      await api().updateStartup({
        startup_id: startup.startup_id,
        ...values,
        notes,
      });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {Object.values(values).filter(Boolean).length}/4 materials linked
        </p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        {MATERIALS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            {editing ? (
              <input
                type="url"
                value={values[key]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : values[key] ? (
              <a
                href={values[key]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {values[key]}
              </a>
            ) : (
              <p className="text-sm text-gray-300 italic">Not set</p>
            )}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          {editing ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : notes ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {notes}
            </p>
          ) : (
            <p className="text-sm text-gray-300 italic">No notes</p>
          )}
        </div>

        {editing && (
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setValues({
                  pitch_deck_url: startup.pitch_deck_url,
                  data_room_url: startup.data_room_url,
                  pl_url: startup.pl_url,
                  investment_memo_url: startup.investment_memo_url,
                });
                setNotes(startup.notes);
                setEditing(false);
              }}
              className="px-4 py-2 text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
