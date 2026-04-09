"use client";

import { useState } from "react";
import Modal from "./Modal";

interface StageRow {
  id: string;
  name: string;
  investorCount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  stages: string[];
  /** Map of stage name → number of investors in that stage (for the current project) */
  investorCountByStage: Record<string, number>;
  onSave: (stages: string[]) => Promise<void>;
}

export default function StageEditor({ open, onClose, stages, investorCountByStage, onSave }: Props) {
  const [rows, setRows] = useState<StageRow[]>(() =>
    stages.map((name, i) => ({
      id: `stage_${i}_${Date.now()}`,
      name,
      investorCount: investorCountByStage[name] || 0,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset rows when modal opens with new stages
  const [prevStages, setPrevStages] = useState(stages);
  if (stages !== prevStages) {
    setPrevStages(stages);
    setRows(
      stages.map((name, i) => ({
        id: `stage_${i}_${Date.now()}`,
        name,
        investorCount: investorCountByStage[name] || 0,
      }))
    );
  }

  const updateName = (id: string, name: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setRows((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: `stage_new_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, name: "", investorCount: 0 },
    ]);
  };

  const handleSave = async () => {
    setError(null);
    const names = rows.map((r) => r.name.trim()).filter(Boolean);
    if (names.length === 0) {
      setError("At least one stage is required.");
      return;
    }
    const unique = new Set(names);
    if (unique.size !== names.length) {
      setError("Duplicate stage names are not allowed.");
      return;
    }
    setSaving(true);
    try {
      await onSave(names);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save stages");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = (() => {
    const currentNames = rows.map((r) => r.name.trim()).filter(Boolean);
    if (currentNames.length !== stages.length) return true;
    return currentNames.some((n, i) => n !== stages[i]);
  })();

  // Stages being removed that have investors
  const removedWithInvestors = stages
    .filter((s) => !rows.some((r) => r.name.trim() === s))
    .filter((s) => (investorCountByStage[s] || 0) > 0);

  const firstStageName = rows[0]?.name.trim() || "first stage";

  return (
    <Modal open={open} onClose={onClose} title="Edit Funnel Stages">
      <div className="space-y-4">
        {error && (
          <div className="bg-md-error_container rounded-2xl px-4 py-3 text-sm text-md-error">
            {error}
          </div>
        )}

        <p className="body-sm text-md-on_surface_variant">
          Add, remove, rename, or reorder funnel columns. Changes apply to all projects.
        </p>

        {/* Stage rows */}
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="flex items-center gap-2 bg-md-surface_container_low rounded-2xl px-3 py-2.5"
            >
              {/* Up/down arrows */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="w-5 h-5 flex items-center justify-center rounded text-md-on_surface_variant hover:bg-md-surface_container_high disabled:opacity-20 transition-colors"
                  title="Move up"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === rows.length - 1}
                  className="w-5 h-5 flex items-center justify-center rounded text-md-on_surface_variant hover:bg-md-surface_container_high disabled:opacity-20 transition-colors"
                  title="Move down"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {/* Stage name input */}
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateName(row.id, e.target.value)}
                placeholder="Stage name..."
                className="flex-1 px-3 py-1.5 rounded-xl text-sm bg-md-surface_container_lowest text-md-on_surface placeholder:text-md-on_surface_variant/40 focus:outline-none focus:ring-2 focus:ring-md-primary_container/40"
              />

              {/* Investor count badge */}
              {row.investorCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-md-surface_container_high text-md-on_surface_variant rounded-lg flex-shrink-0" title={`${row.investorCount} investor(s) in this stage`}>
                  {row.investorCount}
                </span>
              )}

              {/* Delete button */}
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-md-on_surface_variant hover:text-md-error hover:bg-md-error_container/20 disabled:opacity-20 transition-colors flex-shrink-0"
                title="Remove stage"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add stage button */}
        <button
          onClick={addRow}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm rounded-2xl text-md-primary hover:bg-md-surface_container_low transition-colors font-medium"
          style={{ border: "1px dashed rgba(211, 196, 185, 0.4)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Stage
        </button>

        {/* Warning for removed stages with investors */}
        {removedWithInvestors.length > 0 && (
          <div className="bg-amber-50 rounded-2xl px-4 py-3">
            <p className="text-sm text-amber-800 font-medium mb-1">Investors will be moved</p>
            <p className="text-xs text-amber-700">
              {removedWithInvestors.map((s) => (
                <span key={s}>
                  Stage &quot;{s}&quot; has {investorCountByStage[s]} investor(s).{" "}
                </span>
              ))}
              They will be moved to &quot;{firstStageName}&quot;.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-sm text-md-on_surface_variant hover:text-md-on_surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-5 py-2.5 text-sm rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
