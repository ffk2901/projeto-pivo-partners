"use client";

import { useState, useMemo } from "react";
import type { Investor } from "@/types";
import Modal from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  investors: Investor[];
  excludeIds: Set<string>;
  onSelect: (investorId: string) => Promise<void>;
}

export default function InvestorPicker({ open, onClose, investors, excludeIds, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(() => {
    return investors.filter((i) => !excludeIds.has(i.investor_id));
  }, [investors, excludeIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (i) =>
        i.investor_name.toLowerCase().includes(q) ||
        i.tags.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q)
    );
  }, [available, search]);

  const handleSelect = async (investorId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onSelect(investorId);
      setSearch("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add investor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setSearch("");
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Investor to Funnel">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search investors by name, tags, or email..."
            autoFocus
            disabled={loading}
            className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-ink-400 disabled:opacity-50"
          />
        </div>

        <p className="text-xs text-ink-500">
          {filtered.length} investor{filtered.length !== 1 ? "s" : ""} available
          {excludeIds.size > 0 && ` (${excludeIds.size} already in funnel)`}
        </p>

        <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-5 h-5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin mb-2"></div>
              <p className="text-sm text-ink-400">Adding investor...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-ink-400">
                {available.length === 0
                  ? "All investors are already in this funnel."
                  : "No investors match your search."}
              </p>
            </div>
          ) : (
            filtered.map((inv) => (
              <button
                key={inv.investor_id}
                onClick={() => handleSelect(inv.investor_id)}
                disabled={loading}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-brand-100/60 transition-colors group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-800 group-hover:text-brand-700">
                      {inv.investor_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {inv.tags && (
                        <div className="flex flex-wrap gap-1">
                          {inv.tags.split(";").filter(Boolean).slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {inv.email && (
                        <span className="text-[10px] text-ink-400">{inv.email}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Add
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
